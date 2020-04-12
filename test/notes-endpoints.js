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

        context('Given no notes', () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/notes')
                    .expect(200, [])
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

        context('Given no notes', () => {
            it(`responds with 404`, () => {
                const noteId = 123456
                return supertest(app)
                    .get(`/notes/${noteId}`)
                    .expect(404, {
                        error: { message: `Note Not Found` }
                    })
            })
        })
    })

    describe.only('POST /notes', () => {
        context(`creates a new note`, () => {
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

            it(`creates a note, responding with 201 and the new note`, () => {
                const newNote = {
                    note_name: 'test new note name',
                    content: 'test new content',
                    folder_id: 5
                }
                return supertest(app)
                    .post('/notes')
                    .send(newNote)
                    .expect(201)
                    .expect(res => {
                        expect(res.body.note_name).to.eql(newNote.note_name)
                        expect(res.body.content).to.eql(newNote.content)
                        expect(res.body).to.have.property('id')
                        expect(res.body).to.have.property('folder_id')
                    })
                    .then(res =>
                        supertest(app)
                            .get(`/notes/${res.body.id}`)
                            .expect(res.body)    
                    )
            })
        })
    })
    

})