const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeFoldersArray } = require('./folders.fixtures')
const { makeNotesArray } = require('./notes.fixtures')

describe('Notes Endpoints', () => {
    let db 

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db)
    })

    const tableCleanup = () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE');
    
    after('disconnect from db', () => db.destroy())

    before('clean the table', tableCleanup);

    afterEach('clean the table', tableCleanup);

    describe('GET /notes', () => {
        context('Given there are notes in the database', () => {
            const testFolders = makeFoldersArray()
            const testNotes = makeNotesArray()
    
            beforeEach('insert notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            })
    
            it('GET /notes responds with 200 and all the notes', () => {
                return supertest(app)
                    .get('/notes')
                    .expect(200, testNotes)
            })
    
        })
    })

    describe('GET /notes/:note_id', () => {
        context('Given there are notes in the database', () => {
            const testFolders = makeFoldersArray()
            const testNotes = makeNotesArray()

            beforeEach('insert notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            })

            it('GET /notes/:note_id responds with 200 and specified note', () => {
                const noteId = 2
                const expectedNote = testNotes[noteId - 1]
                return supertest(app)
                    .get(`/notes/${noteId}`)
                    .expect(200, expectedNote)
            })
        })
    })

})