import React, { useEffect, useState } from "react";
const axios = require('axios');

const SERVER_URL = 'http://localhost:8008'
const roomAliases = ['#bb-demo:matrix.web3oidc.localhost']

const storeMatrixAccessToken = (accessToken, local, memory) => {
  memory(accessToken)
  local.setItem('matrixAccessToken', accessToken)
}

export default function ChatWindow({ loginToken, accessToken }) {
  console.log('THE LOGIN TOKEN IS', loginToken)

  const [matrixAccessToken, setMatrixAccessToken] = useState('')
  const [isUserSignedIn, setIsUserSignedIn] = useState(false)
  const [roomIds, setRoomIds] = useState([])
  const [roomEvents, setRoomEvents] = useState([])

  const matrixHost = 'http://localhost:8008/_matrix/client/r0'
  // TODO back state with local storage

  useEffect(() => {
    const roomIds = async () => {
      const rooms = await Promise.all(roomAliases.map(async room => {
        const { data } = await axios.get(`${SERVER_URL}/_matrix/client/r0/directory/room/${encodeURIComponent(room)}`)
        return data.room_id
      }))

      setRoomIds(rooms)
    }
    roomIds()
      .then(() => {
        if (accessToken) {
          setMatrixAccessToken(accessToken)
        } else if (loginToken) {
          const getAccessToken = async () => {
            const { data } = await axios.post(`${SERVER_URL}/_matrix/client/r0/login`, {
              type: 'm.login.token',
              token: loginToken,
              txn_id: `best-txn-${Date.now()}`
            })

            console.log('the data we done got', data)
            return data
          }
          getAccessToken()
            .then(({ access_token }) => storeMatrixAccessToken(access_token, window.localStorage, setMatrixAccessToken))
            .then(() => { window.location.href = 'http://localhost:3000' })
            .catch(err => console.log('error is', err))
        } else {
          throw new Error('do something nicer than this')
        }
      })
  }, [])

  // connect to room and load chat
  useEffect(() => {
    const loadMessages = async () => {
      const headers = {
        Authorization: `Bearer ${matrixAccessToken}`
      }

      try {
        const joinUrl = `${SERVER_URL}/_matrix/client/r0/rooms/${roomIds[0]}/join`
        const joinResponse = await axios.post(joinUrl, {}, { headers })
        console.log('joining', joinResponse.data)
      } catch (err) {
        console.error('failed to join', err.response.data, err.response.status)
      }

      // query messages endpoint
      const msgUrl = `${SERVER_URL}/_matrix/client/r0/rooms/${roomIds[0]}/messages?dir=b&limit=20` // TODO room selector
      const { data } = await axios.get(msgUrl, { headers })

      //console.log('the datas', data)

      const events = data.chunk.map(e => {
        let message = e.content.body
        if (e.type === 'm.room.member') {
          message = `${e.content.displayname} ${e.content.membership === 'join' ? 'joined' : 'left'} the room`
        }

        return {
          id: e.event_id,
          sender: e.sender,
          dt: new Date(e.origin_server_ts),
          message,
        }
      })
      setRoomEvents(events)
      console.log('the events', events)

      // store the start/end tokens

    }

    loadMessages()
  }, [matrixAccessToken])

  const listItemStyle = {
    textAlign: 'left',
    padding: '0.75em',
    border: '1px solid #ccc',
    margin: '0.5em 0',
  }

  return (
    <div style={{ width: '50%', margin: '0 auto' }}>
      <h2>Connected to {roomIds[0]}</h2>
      <ul style={{ listStyleType: 'none' }}>
        {roomEvents.map(({ id, sender, dt, message }) => (
          <li style={listItemStyle} key={id}>
            <time dateTime={dt.toISOString()}>
              <em>{sender.split(':')[0]}</em> at {dt.toLocaleTimeString()}
            </time>:
            <br />{message}
          </li>
        ))}
      </ul>
    </div>
  )
}
