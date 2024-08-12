/* eslint-disable @typescript-eslint/no-explicit-any */

//  Copyright 2022. The Tari Project
//
//  Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
//  following conditions are met:
//
//  1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
//  disclaimer.
//
//  2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
//  following disclaimer in the documentation and/or other materials provided with the distribution.
//
//  3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote
//  products derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
//  INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//  DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
//  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
//  SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
//  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
//  USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import "./Home.css";
import { StyledPaper } from "../../components/StyledComponents";
import Grid from "@mui/material/Grid";
import SecondaryHeading from "../../components/SecondaryHeading";
import { FinalizeResult, TemplateDef } from "@tari-project/wallet_jrpc_client";
import { useState, useEffect, useCallback } from "react";
import SettingsForm, { Settings } from "./SettingsForm.tsx";
import CallTemplateForm from "../../components/CallTemplateForm.tsx";
import { Error } from "@mui/icons-material";
import * as wallet from "../../wallet.ts";
import { Alert, CircularProgress } from "@mui/material";
import Button from "@mui/material/Button";
import useSettings from "../../store/settings.ts";
import useTariProvider from "../../store/provider.ts";
import { Account } from "@tari-project/tarijs";
import { AccountsGetBalancesResponse } from "@tari-project/wallet_jrpc_client";
import AccountDetails from "../../components/AccountDetails.tsx";

function Home() {
  const { settings, setSettings } = useSettings();
  const { provider } = useTariProvider();

  const [account, setAccount] = useState<Account>();
  const [accountBalances, setAccountsBalances] =
    useState<AccountsGetBalancesResponse>();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [components, setComponents] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null
  );
  const [templateDefinition, setTemplateDefinition] =
    useState<TemplateDef | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    index: number;
    result: FinalizeResult | null;
  } | null>(null);

  const onRefreshBalances = useCallback(async () => {
    console.log("=== account balances update ===");
    try {
      if (!account || !provider) return;
      const accountBalances = await provider.getAccountBalances(
        account.address
      );
      console.log(accountBalances);
      setAccountsBalances(accountBalances);
    } catch (e) {
      console.error(e);
    }
  }, [account, provider]);

  const onSaveSettings = (settings: Settings) => {
    localStorage.setItem("settings", JSON.stringify(settings));
    setSettings(settings);
  };
  console.log("set is loading", isLoading);
  console.log("templ", templateDefinition);
  console.log("com", components);
  console.log("bad", badges);
  console.log("balances", accountBalances);

  useEffect(() => {
    if (!provider) {
      return;
    }
    console.log("dupa");
    const getTemplateDef = (
      settings.template
        ? wallet.getTemplateDefinition(provider, settings.template)
        : Promise.resolve(null)
    )
      .then(setTemplateDefinition)
      .catch((e) => {
        console.log("settemplate error", e);
        setError(e.message);
      });
    console.log("dupa2");

    const getBadges = wallet
      .listSubstates(provider, null, "Resource")
      .then((resp) => {
        console.log("badges", resp);
        setBadges(
          // Best guess :/
          resp.substates
            // .filter((s) => !!s.substate_id)
            .map((s) => s.substate_id)
        );
      })
      .catch((e) => {
        console.log("getbadges error", e);
        setError(e.message);
      });

    console.log("dupa3");
    const getComponents = (
      settings.template
        ? wallet.listSubstates(provider, settings.template, "Component")
        : Promise.resolve(null)
    )
      .then((resp) => {
        console.log("comp response", resp);
        if (resp?.substates?.length) {
          setComponents(
            resp.substates
              // .filter((s) => !!s.substate_id)
              .map((s) => s.substate_id)
          );
        } else {
          setComponents([]);
        }
      })
      .catch((e) => {
        console.log("get comp response");
        console.log("getcomponents error", e);

        setError(e.message);
      });

    Promise.allSettled([getBadges, getComponents, getTemplateDef]).then(() => {
      setIsLoading(false);
    });
  }, [settings, provider]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    provider
      .getAccount()
      .then((resp) => {
        setAccount(resp);
      })
      .catch((e) => {
        console.log("setaccount error", e);
        setError(e.message);
      });
  }, [provider]);

  useEffect(() => {
    if (!selectedComponent) {
      setSelectedComponent(components.length > 0 ? components[0] : null);
    }
  }, [components, selectedComponent]);

  if (!provider || !settings || !settings.template) {
    return (
      <>
        <AccountDetails
          account={account}
          balances={accountBalances}
          onRefreshBalances={onRefreshBalances}
        ></AccountDetails>
        <HomeLayout
          error={error}
          settings={settings}
          setSettings={onSaveSettings}
        >
          {provider ? (
            <pre>Please add a template address to settings</pre>
          ) : (
            <pre>Please connect your wallet</pre>
          )}
        </HomeLayout>
      </>
    );
  }

  const forms = templateDefinition?.V1.functions.map((func, i) => {
    return (
      <>
        <CallTemplateForm
          key={`calltemplate${i}`}
          func={func}
          badges={badges}
          selectedBadge={selectedBadge}
          onBadgeChange={setSelectedBadge}
          components={components}
          selectedComponent={selectedComponent}
          onComponentChange={setSelectedComponent}
          onCall={(values) => {
            setLastResult({ index: i, result: null });
            wallet
              .buildInstructionsAndSubmit(
                provider,
                settings,
                selectedBadge,
                selectedComponent,
                func,
                values
              )
              .then((resp) => {
                setLastResult({
                  index: i,
                  result: resp.result as FinalizeResult,
                });
              })
              .catch((e) => {
                setLastResult(null);
                setError(e.message);
              });
          }}
        />
        {lastResult?.result && lastResult.index === i ? (
          <Grid key={`grid${i}`} item xs={12} md={12} lg={12}>
            {(lastResult as any).result.result.Accept ? (
              <Alert severity="success">
                Accept:
                <pre>
                  {JSON.stringify((lastResult as any).result.result.Accept)}
                </pre>
                {lastResult.result.execution_results
                  .filter((r) => r.indexed.value !== "Null")
                  .map((r, i) => (
                    <p key={`return${i}`}>{JSON.stringify(r.indexed.value)}</p>
                  ))}
              </Alert>
            ) : (lastResult as any).result.result.AcceptFeeRejectRest ? (
              <Alert severity="error">
                AcceptFeeRejectRest: Error calling function:{" "}
                {JSON.stringify(
                  (lastResult as any).result.result.AcceptFeeRejectRest[1]
                )}
              </Alert>
            ) : (
              <Alert severity="error">
                Error calling function:{" "}
                {JSON.stringify((lastResult as any).result.result.Reject)}
              </Alert>
            )}

            {lastResult.result.logs.map((log, j) => (
              <p key={`logs${j}`}>
                {log.level} {log.message}
              </p>
            ))}
          </Grid>
        ) : (
          lastResult?.index === i && <CircularProgress />
        )}
      </>
    );
  });

  return (
    <>
      <AccountDetails
        account={account}
        balances={accountBalances}
        onRefreshBalances={onRefreshBalances}
      ></AccountDetails>
      <HomeLayout
        error={error}
        settings={settings}
        onCreateFreeTestCoins={async () => {
          await wallet.createFreeTestCoins(provider);
        }}
        setSettings={onSaveSettings}
      >
        {isLoading ? <CircularProgress /> : null}
        {forms?.map((form, i) => (
          <Grid key={`form${i}`} item xs={12} md={12} lg={12}>
            {form}
          </Grid>
        ))}
      </HomeLayout>
    </>
  );
}

interface LayoutProps {
  error: string | null;
  settings: Settings | null;
  setSettings: (settings: Settings) => void;
  onCreateFreeTestCoins?: () => void;
  children: React.ReactNode;
}

function HomeLayout({
  error,
  settings,
  setSettings,
  onCreateFreeTestCoins,
  children,
}: LayoutProps) {
  return (
    <>
      <Grid item sm={12} md={12} xs={12}>
        <SecondaryHeading>Template</SecondaryHeading>
      </Grid>
      <Grid item xs={12} md={12} lg={12}>
        {error && (
          <Alert icon={<Error />} severity="error">
            {error}
          </Alert>
        )}
        <StyledPaper>
          {
            <Button
              disabled={!onCreateFreeTestCoins}
              onClick={onCreateFreeTestCoins}
            >
              Create Free Test Coins
            </Button>
          }
          {settings ? (
            <SettingsForm settings={settings} onSave={setSettings} />
          ) : (
            <CircularProgress />
          )}
        </StyledPaper>
      </Grid>
      <Grid item xs={12} md={12} lg={12}>
        <StyledPaper>{children}</StyledPaper>
      </Grid>
    </>
  );
}

export default Home;
