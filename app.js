const logger = require("./lib/logger")
const main = require('./main')
const express = require('express');
require('express-async-errors')
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser')

const cors = require('cors')  // 跨域

logger.error("日志级别检测: error up")
logger.info("日志级别检测: info up")
logger.debug("日志级别检测: debug up")

let app = express();

// http载荷报文大小限制
app.use(express.json({
    limit: '50mb',
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function (req, res, buf) {
        // if (req.originalUrl.startsWith("/openapi")) {
            req.rawBody = buf.toString();
        // }
    },
}))
// json 解析
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
// 跨域
app.use(cors())



// 日志中间件
// 解决自定义格式时状态码不着色的问题
morgan.token(`status`, (req, res) => {
    const status = (typeof res.headersSent !== `boolean`
        ? Boolean(res._header)
        : res.headersSent)
        ? res.statusCode
        : undefined
    // get status color
    const color =
        status >= 500
            ? 31 // red
            : status >= 400
            ? 33 // yellow
            : status >= 300
                ? 36 // cyan
                : status >= 200
                    ? 32 // green
                    : 0 // no color
    return `\x1b[${color}m${status}\x1b[0m`
})
const devModify = ':method :url :status :response-time ms'
const combinedModify = ':remote-addr :method :url :status :response-time ms :user-agent"'
const morganFormat = process.env.NODE_ENV === 'dev' ? devModify : combinedModify
app.use(morgan(morganFormat, {stream: logger.stream}));

app.use('/', express.static('public'));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use((req, res, next) => {
    if (!req.user) {
        try {
            req.user = JSON.parse(Buffer.from(req.headers.authorization.split('.')[1], "base64").toString())
        } catch (e) {
            // do nothing
        }
    }
    next()
})


main(app)



module.exports = app;