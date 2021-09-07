import React, { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { message, Button, Card } from 'antd'
import { useUserAddress } from 'eth-hooks'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { Web3Provider } from '@ethersproject/providers'

import { Account } from '../components'
import { INFURA_ID } from '../constants'
import { useUserProvider } from '../hooks'

const axios = require('axios');
const serverUrl = "https://localhost:49832/"

/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  //network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
}

// TODO check response_type and redirect_uri matches client registration
const validateAuthFields = ({ response_type, client_id, redirect_uri }) => {
  return response_type && client_id && redirect_uri
}

// TODO figure out if this simple signing message is enough
const consentToSignIn = ({ address, auth, setLoading, userProvider }) => async () => {
  setLoading(true)

  try{
    const msgToSign = await axios.get(serverUrl)
    console.log("msgToSign",msgToSign)

    if (!msgToSign.data || msgToSign.data.length < 32) {
      setLoading(false)
      return
    }

    let currentLoader = setTimeout(()=>{setLoading(false)},4000)

    // TODO save signature to avoid signing so often
    const finalMessage = msgToSign.data.replace("**ADDRESS**",address)
    const sig = await userProvider.send("personal_sign", [finalMessage, address]);
    console.log("sig",sig)

    clearTimeout(currentLoader)
    currentLoader = setTimeout(()=>{setLoading(false)},4000)

    const res = await axios.post(serverUrl, {
      address: address,
      message: finalMessage,
      signature: sig,
    })
    clearTimeout(currentLoader)
    setLoading(false)

    const { code } = res.data
    const redirectTo = `${auth.redirect_uri}?state=${auth.state}&code=${encodeURIComponent(code)}`
    console.log('sending to', redirectTo)
    window.location.href = redirectTo
  } catch(e){
    message.error(' Sorry, the server is overloaded. 🧯🚒🔥');
    console.log("FAILED TO GET...", e)
  }
}

export default function Auth({ mainnetProvider, localProvider, blockExplorer }) {
  const [injectedProvider, setInjectedProvider] = useState();

  const urlParams = new URLSearchParams(useLocation().search)
  if (urlParams.get('loginToken')) {
    window.location.href = `http://localhost:3000/?loginToken=${urlParams.get('loginToken')}`
  }

  const auth = {
    response_type: urlParams.get('response_type'),
    client_id: urlParams.get('client_id'),
    redirect_uri: urlParams.get('redirect_uri'),
    state: urlParams.get('state'),
    nonce: urlParams.get('nonce'),
    scope: urlParams.get('scope')
  }
  console.log('query keys', auth)

  const isSigner = injectedProvider && injectedProvider.getSigner && injectedProvider.getSigner()._isSigner
  const userProvider = useUserProvider(injectedProvider, localProvider);
  const address = useUserAddress(userProvider);

  const [loading, setLoading] = useState(false)

  // TODO use this
  const missingAuthParamMessage = !validateAuthFields(auth)
    ? (<p>Authentication parameters are missing</p>)
    : ''

  const consent = !isSigner ? '' : (
    <Card title="Sign in" style={{ margin: '2em auto', width: 500 }}>
      <p>{auth.client_id} wants to sign-in with your wallet</p>
      <p>Sign-in to {auth.client_id}?</p>
      <Button
        type="primary"
        style={{ margin: '0.5em' }}
        onClick={consentToSignIn({ setLoading, auth, userProvider, address })}
      >Yes</Button>
      <Button style={{ margin: '0.5em' }}>No</Button>
    </Card>
  )

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  return (
    <div className="Auth">
      <Account
        connectText="Connect wallet"
        onlyShowButton={!isSigner}
        address={address}
        localProvider={localProvider}
        userProvider={userProvider}
        mainnetProvider={mainnetProvider}
        web3Modal={web3Modal}
        loadWeb3Modal={loadWeb3Modal}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        blockExplorer={blockExplorer}
      />

      {consent}
    </div>
  )
}

window.ethereum && window.ethereum.on('chainChanged', chainId => {
  web3Modal.cachedProvider &&
  setTimeout(() => {
    window.location.reload();
  }, 1);
})

window.ethereum && window.ethereum.on('accountsChanged', accounts => {
  web3Modal.cachedProvider &&
  setTimeout(() => {
    window.location.reload();
  }, 1);
})

