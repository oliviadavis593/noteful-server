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

    describe('GET /api/notes', () => {
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
                    .get('/api/notes')
                    .expect(200, testNotes)
            })
    
        })

        context('Given no notes', () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200, [])
            })
        })
    })

    describe('GET /api/notes/:note_id', () => {
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

            it('GET /api/notes/:note_id responds with 200 and specified note', () => {
                const noteId = 6
                const expectedNote = testNotes.find(note => note.id === noteId)
                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(200, expectedNote)
            })
        })

        context('Given no notes', () => {
            it(`responds with 404`, () => {
                const noteId = 123456
                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(404, {
                        error: { message: `Note Not Found` }
                    })
            })
        })

        context(`Given an XSS attack note`, () => {
            const testFolders = makeFoldersArray()
            //const testNotes = makeNotesArray()
            const maliciousNote = {
                id: 911, 
                note_name: 'Naughty',
                content: 'Bad',
                modified: '2020-04-12T01:15:22.505Z',
                folder_id: 1,
            }
            
            beforeEach('insert malicious note', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert([ maliciousNote ])
                    })
            })

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/notes/${maliciousNote.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.note_name).to.eql(maliciousNote.note_name)
                        expect(res.body.content).to.eql(maliciousNote.content)
                        expect(res.body.modified).to.eql(maliciousNote.modified)
                        expect(res.body.folder_id).to.eql(maliciousNote.folder_id)
                    })
            })
        })
    })

    describe('POST /api/notes', () => {
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
                    folder_id: 2
                }
                return supertest(app)
                    .post(`/api/notes`)
                    .send(newNote)
                    .expect(201)
                    .expect(res => {
                        expect(res.body.note_name).to.eql(newNote.note_name)
                        expect(res.body.content).to.eql(newNote.content)
                        expect(res.body).to.have.property('id')
                        expect(res.body).to.have.property('folder_id')
                        expect(res.header.location).to.eql(`/api/notes/${res.body.id}`)
                    })
                    .then(res =>
                        supertest(app)
                            .get(`/api/notes/${res.body.id}`)
                            .expect(res.body)    
                    )
            })

            const requiredFields = ['note_name', 'content']

            requiredFields.forEach(field => {
                const newNote = {
                    note_name: 'Test new note',
                    content: 'CONTENT',
                    folder_id: 4
                }

                it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                    delete newNote[field]

                    return supertest(app)
                        .post('/api/notes')
                        .send(newNote)
                        .expect(400, {
                            error: { message: `Missing '${field}' in request body` }
                        })
                })
            })
        })
    })
    
    describe(`DELETE /api/notes/:note_id`, () => {
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

            it('responds with 204 and removes the note', () => {
                const idToRemove = 5
                const expectedNotes = testNotes.filter(note => note.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/notes/${idToRemove}`)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/notes`)
                            .expect(expectedNotes)    
                    )
            })
        })

        context(`Given no notes`, () => {
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

            it(`responds with 404`, () => {
                const noteId = 123456
                return supertest(app)
                    .delete(`/api/notes/${noteId}`)
                    .expect(404, { error: { message: `Note Not Found` } })
            })
        })
    })
    
    describe(`PATCH /api/notes/:note_id`, () => {
        context(`Given no notes`, () => {
            it(`responds with 404`, () => {
                const noteId = 123456
                return supertest(app)
                    .patch(`/api/notes/${noteId}`)
                    .expect(404, {
                        error: { message: `Note Not Found` }
                    })
            })
        })

        context(`Given there are notes in the database`, () => {
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

            it('responds with 204 and updates the note', () => {
                const idToUpdate = 5
                const updateNote = {
                    id: 5, 
                    note_name: 'First test note name',
                    content: 'First content',
                    modified: '2020-03-12T01:10:22.505Z',
                    folder_id: 1
                }
                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updateNote
                }
                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send(updateNote)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(expectedNote)    
                    )
            })

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 5
                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain note_name, content and folder_id`
                        }
                    })
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 5
                const updateNote = {
                    id: 5, 
                    note_name: 'First test note name',
                    content: 'First content',
                    modified: '2020-03-12T01:10:22.505Z',
                    folder_id: 1
                }
                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updateNote
                }

                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send({
                        ...updateNote,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(expectedNote)    
                    )
            })
        })
    })

})