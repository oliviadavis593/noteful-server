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

    describe('GET /folders', () => {
        context('Given there are folders in the database', () => {
            const testFolders = makeFoldersArray()
    
            beforeEach('insert folders', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            })
    
            it('GET /folders responds with 200 and all the folders', () => {
                return supertest(app)
                    .get('/folders')
                    .expect(200, testFolders)
            })
    
        })

        context('Given no folders', () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/notes')
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

            it('GET /folders/:folder_id responds with 200 and specified folder', () => {
                const folderId = 2
                const expectedFolder = testFolders[folderId - 1]
                return supertest(app)
                    .get(`/folders/${folderId}`)
                    .expect(200, expectedFolder)
            })
        })

        context(`Given no folders`, () => {
            it(`responds with 404`, () => {
                const folderId = 123456
                return supertest(app)
                    .get(`/folders/${folderId}`)
                    .expect(404, {
                        error: { message: `Folder Not Found`}
                    })
            })
        })
    })
})

