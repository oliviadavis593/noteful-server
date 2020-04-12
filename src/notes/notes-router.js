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
    .post(jsonParser, (req, res, next) => {
        const { note_name, content, folder_id } = req.body
        const newNote = { note_name, content, folder_id }
        NotesService.insertNotes(
            req.app.get('db'),
            newNote
        )
            .then(note => {
                res
                    .status(201)
                    .json(note)
            })
            .catch(next)
    })

notesRouter
    .route('/notes/:note_id')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        NotesService.getById(knexInstance, req.params.note_id)
            .then(note => {
                if (!note) {
                    return res.status(404).json({
                        error: { message: `Note Not Found` }
                    })
                }
                res.json(note)
            })
            .catch(next)
    })

module.exports = notesRouter