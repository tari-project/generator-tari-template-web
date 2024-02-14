import { Settings } from "./routes/home/SettingsForm.tsx";

import {
  createClient,
  TransactionSubmitRequest,
  FunctionDef,
  SubstatesListRequest,
  SubstatesGetRequest,
  TransactionGetResultResponse,
  Instruction,
  SubstateType,
  SubstateId,
  Arg,
  WalletDaemonClient
} from "@tarilabs/wallet_jrpc_client";

import {providers} from 'tari.js';
const { TariProvider } = providers;


export async function getTemplateDefinition(
  walletdUrl: string,
  template_address: string
) {
  const client = createClient(walletdUrl || "http://localhost:9000");
  await authorizeClient(client);
  const resp = await client.templatesGet({
    template_address
  });
  return resp.template_definition;
}

export async function listSubstates(
  walletdUrl: string,
  template: string | null,
  substateType: SubstateType | null
) {
  const client = createClient(walletdUrl || "http://localhost:9000");
  await authorizeClient(client);
  const resp = await client.substatesList({
    filter_by_template: template,
    filter_by_type: substateType
  } as SubstatesListRequest);
  return resp.substates;
}

export async function getSubstate(walletdUrl: string, substateId: SubstateId) {
  const client = createClient(walletdUrl || "http://localhost:9000");
  await authorizeClient(client);
  const resp = await client.substatesGet({
    substate_id: substateId
  } as SubstatesGetRequest);
  return resp;
}

async function authorizeClient(client: WalletDaemonClient) {
  // TODO: keep this token in local storage
  const token = await client.authRequest(["Admin"]);
  await client.authAccept(token, "web");
}

export async function buildInstructionsAndSubmit(
  provider: TariProvider,
  selectedBadge: string | null,
  selectedComponent: string | null,
  func: FunctionDef,
  args: object
) {
  // const client = createClient(settings.walletdUrl || "http://localhost:9000");
  // Login
  // await authorizeClient(client);

  const req = await createTransactionRequest(
    provider,
    selectedBadge,
    selectedComponent,
    func,
    args
  );

  const resp = await provider.submitTransaction({
    account_index: req.signing_key_index,
    instructions: req.instructions,
    fee_instructions: req.fee_instructions,
    input_refs: [],
    required_substates: [],
    is_dry_run: false,
  });

  let result = await waitForTransactionResult(provider, resp.transaction_id);

  // const submitResp = await client.submitTransaction(req);
  // let resp = await client.waitForTransactionResult({
  //   transaction_id: submitResp.transaction_id,
  //   timeout_secs: 60
  // });
  return result;
}

async function waitForTransactionResult(provider: TariProvider, transactionId: string) {
  while (true) {
    const resp =  await provider.getTransactionResult(transactionId) as TransactionGetResultResponse;
    const FINALIZED_STATUSES = [
      "Accepted",
      "Rejected",
      "InvalidTransaction",
      "OnlyFeeAccepted",
      "DryRun"
    ];

    if ( FINALIZED_STATUSES.includes(resp.status) ) {
      return resp;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

export async function createTransactionRequest(
  provider: TariProvider,
  selectedBadge: string | null,
  selectedComponent: string | null,
  func: FunctionDef,
  formValues: object
): Promise<TransactionSubmitRequest> {
  const fee = 2000;
  const {account} = await provider.getAccount();

  const fee_instructions = [
    {
      CallMethod: {
        component_address: account.address.Component,
        method: "pay_fee",
        args: [`Amount(${fee})`]
      }
    }
  ];

  const args = Object.values(formValues) as Arg[];
  const isMethod =
    func.arguments.length > 0 && func.arguments[0].name === "self";

  if (!isMethod && !settings.template) {
    throw new Error("Template not set");
  }

  if (isMethod && !selectedComponent) {
    throw new Error("This call requires a component to be selected");
  }

  let bucketId = 0;

  const proofInstructions: Instruction[] =
    isMethod && selectedBadge
      ? [
          {
            CallMethod: {
              component_address: account.address.Component,
              method: "create_proof_for_resource",
              args: [selectedBadge]
            }
          },
          {
            PutLastInstructionOutputOnWorkspace: { key: [bucketId++] }
          }
        ] as Instruction[]
      : [];

  const callInstruction = isMethod
    ? {
        CallMethod: {
          component_address: selectedComponent,
          method: func.name,
          args: args
        }
      } as Instruction
    : {
        CallFunction: {
          template_address: settings.template,
          function: func.name,
          args: args
        }
      } as Instruction;

  const nextInstructions: Instruction[] =
    func.output.Other?.name === "Bucket"
      ? [
          { PutLastInstructionOutputOnWorkspace: { key: [bucketId] } },
          {
            CallMethod: {
              component_address: account.address.Component,
              method: "deposit",
              args: [{ Workspace: [bucketId] }]
            }
          }
        ] as Instruction[]
      : [];

  const instructions: Instruction[] = [
    ...proofInstructions,
    callInstruction,
    ...nextInstructions,
    "DropAllProofsInWorkspace" as Instruction
  ];

  return {
    signing_key_index: account.key_index,
    fee_instructions,
    instructions,
    inputs: [],
    override_inputs: false,
    is_dry_run: false,
    proof_ids: [],
    min_epoch: null,
    max_epoch: null
  } as TransactionSubmitRequest;
}
