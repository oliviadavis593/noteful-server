const express = require('express')
const FoldersService = require('./folders-service')
const logger = require('../logger')

const foldersRouter = express.Router()
const jsonParser = express.json()

foldersRouter
    .route('/folders')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        FoldersService.getAllFolders(knexInstance)
        .then(folders => {
            res.json(folders)
        })
        .catch(next)
    })


module.exports = foldersRouter