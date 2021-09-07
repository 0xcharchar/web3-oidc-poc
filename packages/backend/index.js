require('dotenv').config()

const ethers = require('ethers')
const express = require('express')
const fs = require('fs')
const https = require('https')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()
const { v4: uuid4 } = require('uuid')

const jsonb64 = data => Buffer.from(JSON.stringify(data)).toString('base64')
const b64json = b64 => JSON.parse(Buffer.from(b64, 'base64').toString('ascii'))

const isDev = process.env.NODE_ENV === 'development'

// temporary storage for tokens, not production worthy
let codeCache = {}

// temporary storage for clients
const clients = {}

const AUTH_CODE_EXPIRY = 3 * 60000 // x minutes in milliseconds

const currentMessage = userAddr => `I am ${userAddr} and I would like to sign in to YourDapp, plz!`

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', function (req, res) {
  console.log('/')
  res.status(200).send(currentMessage('**ADDRESS**'))
})

// TODO should only respond with JSON
app.post('/', function (request, response) {
  const ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress
  console.log('POST from ip address:', ip, request.body.message)

  if (request.body.message !== currentMessage(request.body.address)) {
    response.status(400).send(' ⚠️ Secret message mismatch!?! Please reload and try again. Sorry! 😅')
    return
  }

  const recovered = ethers.utils.verifyMessage(request.body.message, request.body.signature)
  if (recovered == request.body.address) {
    const authCode = {
      address: request.body.address,
      client: request.body.clientId,
      expires: (new Date()).getTime() + AUTH_CODE_EXPIRY
    }

    const code = jsonb64(authCode)
    codeCache[code] = authCode
    response.json({ code })
  }
})

app.post('/register', (req, res) => {
  const { clientId } = req.body
  if (!clientId) {
    console.log('heh', req.body, clientId)
    return res.status(400).json({
      message: 'Bad Request',
      status: 400,
      data: {
        fields: ['clientId']
      }
    })
  }

  if (clients[clientId]) {
    return res.status(422).json({
      message: 'Unprocessable Entity',
      status: 422,
      data: {
        detail: 'ClientId is already registered'
      }
    })
  }

  const clientDetails = {
    // secret: uuid4(),
    secret: Buffer.from('everyone gets the same secret').toString('base64'),
    redirectUri: '' // TODO should be used to stop xss and open redirects 
  }

  clients[clientId] = clientDetails

  res.json({ ...clientDetails, clientId })
})

// REPLAY ATTACKS ARE TOO EASY
// Should be hashing things, validating hashes, all that stuff
// This is not production worthy
// Need to add JSON schema check too (way simpler than this noise)
app.post('/token', (req, res) => {
  const { authorization } = req.headers
  const { grant_type, code, redirect_uri } = req.body

  if (!authorization) return res.status(400).json({
    error: 'invalid_request',
    error_description: 'Missing authorization header'
  })

  if (!grant_type || !code || !redirect_uri) {
    const missingFields = ['grant_type', 'code', 'redirect_uri']
      .map(key => ({ key, value: req.body[key] }))
      .filter(field => !field.value)
      .map(field => field.key)

    return res.status(400).json({
      error: 'invalid_request',
      error_description: `Missing fields: ${missingFields.join(', ')}`
    })
  }

  /*
   * client_id doesn't need to be passed so I need to stuff it in the auth header but too much changes so TODO
  if (!isDev) {
    const clientSecret = Buffer.from(authorization, 'base64').toString()
    if (clients[client_id].secret !== clientSecret) return res.status(401).json({
      error: 'unauthorized_client',
      error_description: 'Client secret does not match'
    })
  }
  */

  const existingCode = codeCache[code]
  console.log('existing code', { code, codeCache, existingCode, dt: (new Date()).getTime() })
  if (!existingCode || (new Date()).getTime() > existingCode.expires) return res.status(403).json({
    error: 'access_denied',
    error_description: `Either no code (${!!existingCode}) or code expired`
  })

  if (grant_type !== 'authorization_code') return res.status(400).json({
    error: 'invalid_request',
    error_description: 'grant_type must be "authorization_code"'
  })

  // remove code from cache
  codeCache = Object.keys(codeCache).filter(k => k !== code).reduce((newCache, key) => {
    newCache[key] = codeCache[key]
    return newCache
  }, {})

  const { address } = b64json(code)

  const access_token = { address }

  // return token
  res.json({
    access_token: jsonb64(access_token),
    expires_in: 3600,
    refresh_token: 'best-refresh-ever',
    token_type: 'Bearer'
  })
})

// TODO actually support async and not rely on hopes/dreams
// TODO use fastify
app.get('/user', async (req, res) => {
  console.log('USER HEADERS', req.headers)
  const { authorization } = req.headers

  const { address } = b64json(authorization.split(' ')[1])
  const provider = new ethers.providers.InfuraProvider('homestead', process.env.PROVIDER_TOKEN_INFURA)
  const username = await provider.lookupAddress(address) || address

  // TODO 3box or ceramic data
  return res.json({
    sub: username,
    name: 'bob bobby',
    given_name: 'bob',
    family_name: 'bobby',
    preferred_username: username,
    email: `${username}@fakedomain.nfts`
  })
})

if (fs.existsSync('server.key') && fs.existsSync('server.crt')) {
  https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
  }, app).listen(49832, () => {
    console.log('HTTPS Listening: 49832')
  })
} else {
  var server = app.listen(49832, function () {
    console.log('HTTP Listening on port:', server.address().port)
  })
}
