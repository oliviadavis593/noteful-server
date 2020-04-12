const express = require('express')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

notesRouter
    .route('/notes')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        NotesService.getAllNotes(knexInstance)
            .then(notes => {
                res.json(notes)
            })
            .catch(next)
    })

module.exports = notesRouter