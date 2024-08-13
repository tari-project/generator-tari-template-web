import { Settings } from "./routes/home/SettingsForm.tsx";
import {
  FunctionDef,
  SubstateType,
  Arg,
} from "@tari-project/wallet_jrpc_client";

import {
  TariProvider,
  MetamaskTariProvider,
  WalletDaemonTariProvider,
  SubmitTransactionRequest,
  WalletConnectTariProvider,
  TariUniverseProvider,
  TransactionBuilder,
  Amount,
  fromWorkspace,
  buildTransactionRequest,
  submitAndWaitForTransaction,
  AccountTemplate,
} from "@tari-project/tarijs";
import { Template } from "./templates/Template.ts";
import { SubmitTxResult } from "@tari-project/tarijs/dist/builders/types/TransactionResult";

export async function getTemplateDefinition<T extends TariProvider>(
  provider: T,
  template_address: string
) {
  const resp = await provider.getTemplateDefinition(template_address);
  return resp.template_definition;
}

export async function listSubstates<T extends TariProvider>(
  provider: T | null,
  template: string | null,
  substateType: SubstateType | null
) {
  if (provider === null) {
    throw new Error("Provider is not initialized");
  }
  const substates = await provider.listSubstates(
    template,
    substateType,
    null,
    null
  );
  return substates;
}

export async function createFreeTestCoins<T extends TariProvider>(provider: T) {
  console.log("createFreeTestCoins", provider.providerName);
  switch (provider.providerName) {
    case "TariUniverse": {
      const tuProvider = provider as unknown as TariUniverseProvider;
      await tuProvider.createFreeTestCoins();
      break;
    }
    case "WalletDaemon": {
      const walletProvider = provider as unknown as WalletDaemonTariProvider;
      await walletProvider.createFreeTestCoins();
      break;
    }
    case "WalletConnect": {
      const wcProvider = provider as unknown as WalletConnectTariProvider;
      await wcProvider.createFreeTestCoins();
      break;
    }
    case "Metamask": {
      const metamaskProvider = provider as unknown as MetamaskTariProvider;
      await metamaskProvider.createFreeTestCoins(0);
      break;
    }
    default:
      throw new Error(`Unsupported provider: ${provider.providerName}`);
  }
}

export async function getSubstate<T extends TariProvider>(
  provider: T,
  substateId: string
) {
  const resp = await provider.getSubstate(substateId);
  return resp;
}

export async function buildInstructionsAndSubmit(
  provider: TariProvider,
  settings: Settings,
  selectedBadge: string | null,
  selectedComponent: string | null,
  func: FunctionDef,
  args: object
): Promise<SubmitTxResult> {
  const req = await createTransactionRequest(
    provider,
    settings,
    selectedBadge,
    selectedComponent,
    func,
    args
  );

  const tx = await submitAndWaitForTransaction(provider, req);
  return tx;
}

export async function createTransactionRequest(
  provider: TariProvider,
  settings: Settings,
  selectedBadge: string | null,
  selectedComponent: string | null,
  func: FunctionDef,
  formValues: object
): Promise<SubmitTransactionRequest> {
  const args = Object.values(formValues) as Arg[];
  const isMethod =
    func.arguments.length > 0 && func.arguments[0].name === "self";

  if (!isMethod && !settings.template) {
    throw new Error("Template not set");
  }

  if (isMethod && !selectedComponent) {
    throw new Error("This call requires a component to be selected");
  }

  const fee = new Amount(2000);
  const maxfee = fee.getStringValue();
  const account = await provider.getAccount();
  const accountComponent = new AccountTemplate(account.address);
  const txBuilder = new TransactionBuilder();
  const template: Template = isMethod
    ? new Template(selectedComponent ?? "", undefined, func.name)
    : new Template(settings.template ?? "", func.name, undefined);

  const transaction = txBuilder.feeTransactionPayFromComponent(
    account.address,
    maxfee
  );

  isMethod && selectedBadge
    ? [
        transaction
          .createProof(account.address, selectedBadge)
          .saveVar("proofInstruction"),
      ]
    : [];

  isMethod
    ? transaction.callMethod(template.method, args)
    : transaction.callFunction(template.fct, args);

  func.output;

  if (
    typeof func.output === "object" &&
    "Other" in func.output &&
    func.output.Other.name === "Bucket"
  )
    transaction
      .saveVar("deposit")
      .callMethod(accountComponent.deposit, [fromWorkspace("deposit")]);

  const txBuilt = transaction.dropAllProofsInWorkspace().build();
  const required_substates = [{ substate_id: account.address, version: null }];

  if (selectedComponent) {
    required_substates.push({ substate_id: selectedComponent, version: null });
  }

  const req = buildTransactionRequest(
    txBuilt,
    account.account_id,
    required_substates
  );

  return req;
}
