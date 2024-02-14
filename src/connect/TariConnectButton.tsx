import * as React from 'react';

import Button from "@mui/material/Button";
import TariLogoWhite from './content/tari-logo-white.svg';
import {TariWalletSelectionDialog} from './TariWalletSelectionDialog';
import {useEffect} from "react";

export function TariConnectButton() {
  const [walletSelectionOpen, setWalletSelectionOpen] = React.useState(false);

  const handleConnectClick = () => {
    setWalletSelectionOpen(true);
  };

  const onWalletSelectionClose = () => {
    setWalletSelectionOpen(false);
  };

  const [isConnected, setIsConnected] = React.useState(false);
  useEffect(() => {
    setInterval(() => {
      if (window.tari && window.tari?.isConnected() && isConnected != window.tari?.isConnected()) {
        setIsConnected(window.tari.isConnected());
      }
    }, 1000);
  }, []);

  return (
    <>
      <Button variant='contained' onClick={handleConnectClick}>
        <img width="30px" height="30px" src={TariLogoWhite}/>
        <div style={{paddingLeft: '10px'}}>{isConnected ? "Connected" : "Connect"}</div>
      </Button>
      <TariWalletSelectionDialog
        open={walletSelectionOpen}
        onClose={onWalletSelectionClose}
      />
    </>
  );
}
