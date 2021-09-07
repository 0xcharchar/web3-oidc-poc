# Web3 OpenID Connect Proof of Concept

Forked from scaffold-eth.

This performs an OAuth2.0 flow plus fakes an OpenID `userinfo` endpoint, making it an OpenID Connect (OIDC) flow.

[Demo video available on PeerTube](https://peertube.co.uk/videos/watch/96f4b9be-e09f-45e9-9e4e-c50ca07a67ec)

## Architecture

This project acts as a read-only chat client for Matrix as well as an Identity Provider (IDP) in an OIDC flow.

The `react-app` has an `/auth` endpoint which is where wallet connect, user consent, and message signing occur. The backend REST API provides a place to verify the message signing, auth code and token generation, and, finally, user information.

The matrix-synapse service simply acts as a real world use case for this type of flow.

## Running it

Run the Matrix Synapse server and backend application:

```sh
docker-compose up
```

Run the frontend app:

```sh
# frontend
yarn start
```
