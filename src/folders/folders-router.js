const express = require('express')
const xss = require('xss')
const FoldersService = require('./folders-service')
const logger = require('../logger')

const foldersRouter = express.Router()
const jsonParser = express.json()

foldersRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        FoldersService.getAllFolders(knexInstance)
        .then(folders => {
            res.json(folders)
        })
        .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { folder_name } = req.body
        const newFolder = { folder_name }

        if (!folder_name) {
            return res.status(400).json({
                error: { message: `Missing 'folder_name' in request body` }
            })
        }

        FoldersService.insertFolders(
            req.app.get('db'),
            newFolder
        )
            .then(folder => {
                res
                    .status(201)
                    .location(`/folders/${folder.id}`)
                    .json(folder)
            })
            .catch(next)
    })

foldersRouter
    .route('/:folder_id')
    .all((req, res, next) => {
        FoldersService.getById(
            req.app.get('db'), 
            req.params.folder_id
        )
            .then(folder => {
                if (!folder) {
                    return res.status(404).json({
                        error: { message: `Folder Not Found` }
                    })
                }
                res.folder = folder 
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json({
            id: res.folder.id, 
            folder_name: res.folder.folder_name
        })
    })
    .delete((req, res, next) => {
        FoldersService.deleteFolder(
            req.app.get('db'),
            req.params.folder_id
        )
            .then(() => {
                res.status(404).end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { folder_name } = req.body
        const folderToUpdate = { folder_name }
        FoldersService.updateFolder(
            req.app.get('db'),
            req.params.folder_id,
            folderToUpdate
        )
            .then(numRowsAffected => {
                res.status(404).end()
            })
            .catch(next)
    })

module.exports = foldersRouter