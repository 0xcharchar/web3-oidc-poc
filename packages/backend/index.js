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

// temporary storage for tokens, not production worthy
const tokenCache = {}

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

    response.json({ code: jsonb64(authCode) })
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
        detail: 'ClientID is already registered'
      }
    })
  }

  const clientDetails = {
    secret: uuid4(),
    redirectUri: '' // TODO should be used to stop xss and open redirects 
  }

  clients[clientId] = clientDetails

  res.json({ ...clientDetails, clientId })
})

app.post('/token', (req, res) => {
  // TODO
  // const { Authorization } = req.headers
  // make sure header exists
  // make sure all body params exist
  // make sure client id and secret match registered client
  // make sure there is a code for given client
  // make sure code is not expired
  // remove code
  // make a token

  console.log('THE HEADERS', req.headers)
  console.log('THE BODY', req.body)

  const { grant_type, code } = req.body

  if (grant_type !== 'authorization_code') return res.status(400).json({
      message: 'Bad Request',
      status: 400,
    })

  const { address } = b64json(code)

  const access_token = {
    address
  }

  // return token
  res.json({
    access_token: jsonb64(access_token),
    expires_in: 3600,
    refresh_token: 'best-refresh-ever',
    token_type: 'Bearer'
  })
})

app.get('/user', (req, res) => {
  console.log('USER HEADERS', req.headers)
  const { authorization } = req.headers

  const { address } = b64json(authorization.split(' ')[1])

  return res.json({
    sub: address,
    name: 'bob bobby',
    given_name: 'bob',
    family_name: 'bobby',
    preferred_username: address,
    email: 'clownshoes@funstuff.nfts'
  })
})

app.all('*', (req, res, next) => {
  const { headers, body, path } = req
  console.log('catch-all', { headers, body, path })
  next()
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
