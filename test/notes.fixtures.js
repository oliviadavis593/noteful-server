
function makeNotesArray() {
    return [
        {
            id: 5, 
            note_name: 'First test note name',
            content: 'First content',
            modified: '2020-03-12T01:10:22.505Z',
            folder_id: 1
        },
        {
            id: 6, 
            note_name: 'Second test note name',
            content: 'Second content',
            modified: '2020-04-12T01:15:22.505Z',
            folder_id: 2
        }, 
        {
            id: 7, 
            note_name: 'Third test note name',
            content: 'Third content',
            modified: '2020-04-12T01:15:22.505Z',
            folder_id: 3
        }
    ]
}

module.exports = {
    makeNotesArray
}