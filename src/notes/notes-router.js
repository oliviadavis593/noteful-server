const express = require('express')
const xss = require('xss')
const path = require('path')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()


notesRouter
    .route('/')
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

        for (const [key, value] of Object.entries(newNote)) {
            if (value == null) {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body` }
                })
            }
        }

        NotesService.insertNotes(
            req.app.get('db'),
            newNote
        )
            .then(note => {
                res
                    .status(201)
                    .location(req.originalUrl + `/${note.id}`)
                    .json(note)
            })
            .catch(next)
    })

notesRouter
    .route('/:note_id')
    .all((req, res, next) => {
        NotesService.getById(
            req.app.get('db'),
            req.params.note_id
        )
            .then(note => {
                if (!note) {
                    return res.status(404).json({
                        error: { message: `Note Not Found`}
                    })
                }
                res.note = note //save note for next middleware 
                next()
            })
            .catch()
    })
    .get((req, res, next) => {
        res.json({
            id: res.note.id, 
            note_name: xss(res.note.note_name), 
            content: xss(res.note.content), 
            modified: res.note.modified,
            folder_id: res.note.folder_id
        })
    })
    .delete((req, res, next) => {
        NotesService.deleteNote(
            req.app.get('db'),
            req.params.note_id
        )
            .then(() => {
                res.status(204).end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
       const { note_name, content, folder_id, modified} = req.body
       const noteToUpdate = { note_name, content, folder_id, modified }

       NotesService.updateNote(
           req.app.get('db'),
           req.params.note_id, 
           noteToUpdate
       )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = notesRouter
