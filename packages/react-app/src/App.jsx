import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Switch, Route, Link, useLocation } from "react-router-dom";
import "antd/dist/antd.css";
import {  StaticJsonRpcProvider, JsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import "./App.css";
import { message, Row, Col, Button, Menu, Alert, Switch as SwitchD } from "antd";
import { useUserAddress } from "eth-hooks";
import { useExchangePrice, useGasPrice, useUserProvider, useContractLoader, useContractReader, useEventListener, useBalance, useExternalContractLoader, useOnBlock } from "./hooks";
import { Header, Account, Faucet, Ramp, Contract, GasGauge, ThemeSwitch } from "./components";
import { Transactor } from "./helpers";
import { formatEther, parseEther } from "@ethersproject/units";
//import Hints from "./Hints";
import { Auth, Hints, ExampleUI, MainPage, Subgraph } from "./views"
import { useThemeSwitcher } from "react-css-theme-switcher";
import { INFURA_ID, DAI_ADDRESS, DAI_ABI, NETWORK, NETWORKS } from "./constants";
import ChatWindow from './components/ChatWindow.jsx';
const axios = require('axios');
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

//const serverUrl = "https://backend.ether.delivery:49832/"
const serverUrl = "http://localhost:49832/"

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS['mainnet']; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true


// 🛰 providers
if(DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = new StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544")
const mainnetInfura = new StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_I

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if(DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new StaticJsonRpcProvider(localProviderUrlFromEnv);


// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;


function App(props) {

  const mainnetProvider = (scaffoldEthProvider && scaffoldEthProvider._network) ? scaffoldEthProvider : mainnetInfura

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork,mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork,"fast");

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`)
  })

  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(()=>{
    if(DEBUG && mainnetProvider){
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________")
      console.log("🌎 mainnetProvider",mainnetProvider)
    }
  }, [mainnetProvider])


  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname)
  }, [setRoute]);

  return (
    <div className="App">

      <Header />

			<BrowserRouter>
        <Switch>
          <Route exact path="/">
            <MainPage />
          </Route>

          <Route path="/auth">
            <Auth
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              blockExplorer={blockExplorer}
            />
          </Route>
        </Switch>
      </BrowserRouter>

      <ThemeSwitch />
    </div>
  );
}



export default App;
