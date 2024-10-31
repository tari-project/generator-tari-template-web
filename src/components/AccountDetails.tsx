import Grid from "@mui/material/Grid";
import { Box, CircularProgress, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { Account } from "@tari-project/tarijs";
import SecondaryHeading from "./SecondaryHeading";
import { StyledPaper } from "./StyledComponents";
import { AccountsGetBalancesResponse } from "@tari-project/wallet_jrpc_client";

interface LayoutProps {
  onRefreshBalances?: () => void;
  account?: Account;
  balances?: AccountsGetBalancesResponse;
}

function AccountDetails({ onRefreshBalances, account, balances }: LayoutProps) {
  console.log("account", account);
  return (
    <>
      <Grid item xs={12} md={12} lg={12}>
        <SecondaryHeading>Account</SecondaryHeading>
      </Grid>
      <Grid item xs={12} md={12} lg={12}>
        <StyledPaper>
          {account ? (
            <Box sx={{ width: "100%" }}>
              <Button variant="contained" sx={{ width: "auto" }} onClick={onRefreshBalances}>
                Refresh account balances
              </Button>
              <Typography variant="body1">Id: {account.account_id}</Typography>
              <Typography variant="body1">Address: {account.address}</Typography>
              <Typography variant="body1">Resources list length: {account.resources.length}</Typography>
              {account.resources?.map((res, i) => (
                <Grid key={`form${i}`} item xs={12} md={12} lg={12}>
                  {JSON.stringify(res, null, 2)}
                </Grid>
              ))}
              <Typography variant="body1">Balances list length: {balances?.balances.length}</Typography>
              {balances?.balances.map((balance, i) => (
                <Grid key={`form${i}`} item xs={12} md={12} lg={12}>
                  {JSON.stringify(balance, null, 2)}
                </Grid>
              ))}
            </Box>
          ) : (
            <CircularProgress />
          )}
        </StyledPaper>
      </Grid>
    </>
  );
}

export default AccountDetails;
