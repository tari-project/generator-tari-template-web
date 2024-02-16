import * as React from 'react';

import Button from "@mui/material/Button";
import TariLogoWhite from './content/tari-logo-white.svg';
import {TariWalletSelectionDialog} from './TariWalletSelectionDialog';
import {useEffect} from "react";
import {providers} from "tari.js";
const {TariProvider} = providers;

interface Props {
  onConnected: (provider: TariProvider) => void;
}

export function TariConnectButton(props: Props) {
  const {onConnected} = props;
  const [walletSelectionOpen, setWalletSelectionOpen] = React.useState(false);

  const handleConnectClick = () => {
    setWalletSelectionOpen(true);
  };

  const onWalletSelectionClose = () => {
    setWalletSelectionOpen(false);
  };

  const [isConnected, setIsConnected] = React.useState(false);
  useEffect(() => {
    // TODO: this isnt correct and will make many intervals without cancelling them but it works for now
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
        onConnected={onConnected}
      />
    </>
  );
}
