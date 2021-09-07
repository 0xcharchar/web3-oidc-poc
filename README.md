# Web3 OpenID Connect Proof of Concept

Forked from scaffold-eth.

This performs an OAuth2.0 flow plus fakes an OpenID `userinfo` endpoint, making it an OpenID Connect flow.

[Demo video available on PeerTube](https://peertube.co.uk/videos/watch/96f4b9be-e09f-45e9-9e4e-c50ca07a67ec)

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
