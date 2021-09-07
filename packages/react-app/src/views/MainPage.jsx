import React from 'react'
import { Typography } from 'antd'
import { useLocation } from 'react-router-dom'
import { ChatWindow } from '../components'

export default function MainPage () {
  const urlParams = new URLSearchParams(useLocation().search)
  const loginToken = urlParams.get('loginToken')
  console.log('login token is', loginToken)

  const accessToken = window.localStorage.getItem('matrixAccessToken')
  console.log('access token is', accessToken)

  const matrixLoginUrl = `http://matrix.web3oidc.localhost:8008/_matrix/client/r0/login/sso/redirect?redirectUrl=${encodeURIComponent('http://web3oidc.localhost:3000/auth')}`

  return (
    <>
      { !loginToken && !accessToken
        ? <Typography.Link href={matrixLoginUrl}>Login to Matrix</Typography.Link>
        : <ChatWindow loginToken={loginToken} accessToken={accessToken} />
      }
    </>
  )
}
