const { NODE_ENV } = require('./config')
const logger = require('./logger')

function errorHandler(error, req, res, next) {
    let response 
    if (NODE_ENV === 'production') {
        response = error
    } else {
        console.error(error)
        logger.error(error.message)
        response = error 
    }
    res.status(500).json(response)
}

module.exports = errorHandler