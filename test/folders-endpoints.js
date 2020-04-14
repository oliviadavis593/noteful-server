const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeFoldersArray } = require('./folders.fixtures')

describe('Folders Endpoints', function() {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL, 
        })
        app.set('db', db)
    })

    const tableCleanup = () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE');
    
    after('disconnect from db', () => db.destroy())

    before('clean the table', tableCleanup);

    afterEach('clean the table', tableCleanup);

    describe('GET /api/folders', () => {
        context('Given there are folders in the database', () => {
            const testFolders = makeFoldersArray()
    
            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            })
    
            it('GET /api/folders responds with 200 and all the folders', () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, testFolders)
            })
    
        })

        context('Given no folders', () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/notes') //change to folders endpoint 
                    .expect(200, [])
            })
        })
    })

    describe('GET /folders/:folder_id', () => {
        context('Given there are folder in the database', () => {
            const testFolders = makeFoldersArray()

            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            })

            it('GET /api/folders/:folder_id responds with 200 and specified folder', () => {
                const folderId = 2
                const expectedFolder = testFolders[folderId - 1]
                return supertest(app)
                    .get(`/api/folders/${folderId}`)
                    .expect(200, expectedFolder)
            })
        })

        context(`Given no folders`, () => {
            it(`responds with 404`, () => {
                const folderId = 123456
                return supertest(app)
                    .get(`/api/folders/${folderId}`)
                    .expect(404, {
                        error: { message: `Folder Not Found`}
                    })
            })
        })

        context(`Given an XSS attack folder`, () => {
            const maliciousFolder = {
                id: 911, 
                folder_name: 'Naughty folder'
            }

            beforeEach('insert malicious folder', () => {
                return db 
                    .into('noteful_folders')
                    .insert([ maliciousFolder ])
            })

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/folders/${maliciousFolder.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.folder_name).to.eql(maliciousFolder.folder_name)
                    })
            })
        })
    })

    describe('POST /folders', () => {
        it(`creates a folder, responding with 201 and the new folder`, () => {
            const newFolder = {
                folder_name: 'Test new folder'
            }
            return supertest(app)
                .post('/api/folders')
                .send(newFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.folder_name).to.eql(newFolder.folder_name)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/folders/${res.body.id}`)
                })
                .then(res => 
                    supertest(app)
                        .get(`/api/folders/${res.body.id}`)
                        .expect(res.body)    
                )
        })

        it(`responds with 400 and an error message when 'folder_name' is missing`, () => {
            return supertest(app)
                .post('/api/folders')
                .send({
                    folder_name: 'new folder name'
                })
        })

    })

    describe(`DELETE /api/folders/:folder_id`, () => {
        context('Given there are folders in the database', () => {
            const testFolders = makeFoldersArray()

            beforeEach('insert folders', () => {
                return db 
                    .into('noteful_folders')
                    .insert(testFolders)
            })

            
            it('responds with 204 and removes the folder', () => {
                const idToRemove = 2
                const expectedFolder = testFolders.filter(folder => folder.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/folders/${idToRemove}`)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/folders`)
                            .expect(expectedFolder)    
                    )
            })
        })

        context(`Given no folders`, () => {
            it(`responds with 404`, () => {
                const folderId = 123456
                return supertest(app)
                    .delete(`/api/folders/${folderId}`)
                    .expect(404, {
                        error: { message: `Folder Not Found` }
                    })
            })
        })
    })

    describe(`PATCH /api/folders/:folder_id`, () => {
        context(`Given no folders`, () => {
            it(`responds with 404`, () => {
                const folderId = 123456
                return supertest(app)
                    .patch(`/api/folders/${folderId}`)
                    .expect(404, { error: { message: `Folder Not Found`} })
            })
        })

        context('Given there are folders in the database', () => {
            const testFolders = makeFoldersArray()

            beforeEach('insert folders', () => {
                return db 
                    .into('noteful_folders')
                    .insert(testFolders)
            })

            it('responds with 204 and updates the folder', () => {
                const idToUpdate = 2 
                const updateFolder = {
                    folder_name: 'Third test folder',
                }
                const expectedFolder = {
                    ...testFolders[idToUpdate - 1],
                    ...updateFolder
                }
                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send(updateFolder)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/folders/${idToUpdate}`)
                            .expect(expectedFolder)    
                    )
            })

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain 'folder_name'`
                        }
                    })
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2
                const updateFolder = {
                    folder_name: 'Second test folder'
                }
                const expectedFolder =  {
                    ...testFolders[idToUpdate - 1],
                    ...updateFolder
                }

                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send({
                        ...updateFolder, 
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/folders/${idToUpdate}`)
                            .expect(expectedFolder)    
                    )
            })
        })
    })

})

