require('dotenv').config();
process.env.TZ = process.env.TIMEZONE || 'Europe/Madrid';

const express = require('express');
const cors = require('cors');

const authServices = require('./services/frontend/SERV_Auth');
const localDataServices = require('./services/frontend/SERV_LocalData');
const reservationsServices = require('./services/frontend/SERV_Reservations');
const schedulesServices = require('./services/frontend/SERV_Schedules');
const servicesServices = require('./services/frontend/SERV_Services');
const employeesServices = require('./services/frontend/SERV_Employees');
const employeeAbcenseServices = require('./services/frontend/SERV_EmployeeAbsences');
const employeeSchedulesServices = require('./services/frontend/SERV_EmployeeSchedules');
const customersServices = require('./services/frontend/SERV_Customers');

const authAgentServices = require('./services/agent/SERV_AGT_Auth');
const reservationsAgentServices = require('./services/agent/SERV_AGT_Reservations');
const servicesAgentServices = require('./services/agent/SERV_AGT_Services');
const employeesAgentServices = require('./services/agent/SERV_AGT_Employees');
const schedulesAgentServices = require('./services/agent/SERV_AGT_Schedules');
const memoryAgentServices = require('./services/agent/SERV_AGT_AgentMemory');
const localContextAgentServices = require('./services/agent/SERV_AGT_LocalContext');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
//app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const allowedOrigins = [
    'https://reservia-web-client.e3tsad.easypanel.host',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
    'https://127.0.0.1:3000'
];

app.use(cors({
    origin: function(origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
}));

app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
});

app.use('/api', authServices);
app.use('/api', localDataServices);
app.use('/api', reservationsServices);
app.use('/api', schedulesServices);
app.use('/api', servicesServices);
app.use('/api', employeesServices);
app.use('/api', employeeAbcenseServices);
app.use('/api', employeeSchedulesServices);
app.use('/api', customersServices);

app.use('/api/agent', authAgentServices);
app.use('/api/agent', reservationsAgentServices);
app.use('/api/agent', servicesAgentServices);
app.use('/api/agent', employeesAgentServices);
app.use('/api/agent', schedulesAgentServices);
app.use('/api/agent', memoryAgentServices);
app.use('/api/agent', localContextAgentServices);

/*process.on('SIGINT', () => {
    Object.values(pools).forEach(pool => pool.end());
    process.exit();
});*/

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
