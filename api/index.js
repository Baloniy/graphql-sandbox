'use strict'
require('dotenv').config()

const express = require('express')
const { ApolloServer } = require('apollo-server-express')

const expressPlayground = require('graphql-playground-middleware-express').default
const { readFileSync } =  require('fs')
const resolvers = require('./resolvers')
const { MongoClient } = require('mongodb')

const typeDefs = readFileSync('./typeDefs.graphql', 'utf-8')

async function start() {
    const app = express()
    const DB = process.env.DATABASE_URL
    let db

    try {
        const client = await MongoClient.connect(DB, { useUnifiedTopology : true })
        db = client.db()
    } catch (error) {
        console.log(`Mongo DB Host not found!`)
        process.exit(1)
    }
    
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req }) => {
            const githubToken = req.headers.authorization
            const currentUser = await db.collection('users').findOne({ githubToken })
            return { db, currentUser }
        }
    })
    server.applyMiddleware({ app })
    
    app.get('/', (req, res) => {
        let url = `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&scope=user`
        res.end(`<a href="${url}">Sign In with Github</a>`)
    })
    
    app.get('/playground', expressPlayground({ enfpoint: '/graphql'}))
    
    
    const PORT = process.env.port || 4000
    app.listen(PORT, () => console.log(`GraphQL service running on port ${PORT}`))
}

start()

