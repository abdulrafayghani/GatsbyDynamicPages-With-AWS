import fetch from 'cross-fetch';
import { ApolloClient, HttpLink, InMemoryCache,  } from "@apollo/client";

export const client = new ApolloClient({
    link : new HttpLink({
        uri: "https://ulsr6z47i5fmlnhlycrd7ahjce.appsync-api.us-east-2.amazonaws.com/graphql",
        headers: {
            "x-api-key": "da2-r2wl3vq7f5autny6ks77d37zme"
        },
        fetch
    }),
    cache: new InMemoryCache()
})