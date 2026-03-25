const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { 
    findUserByUsername, 
    createUser,
    deleteUser,
    setNewPassword
} = require('../../repositories/DAO_Auth');
const { 
    setSchedules
} = require('../../repositories/DAO_Schedules');
const {
    setServices
} = require('../../repositories/DAO_Services');
const {
    setEmployees,
} = require('../../repositories/DAO_Employees');
const{
    updateEmployeeCount
} = require('../../repositories/DAO_LocalData');
const {
    setOpenRouterKeyByLocalId
} = require('../../repositories/DAO_OpenRouter');
const {
    createOpenRouterApiKey
} = require('../../utils/UTI_OpenRouter');


const router = express.Router();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION;


router.post('/signup', async (req, res) => {
    try {
        const { company, passwordRecoveryCode, schedules, services, employees } = req.body;

        if (!company || !passwordRecoveryCode || !schedules || !services || !employees) 
            return res.status(400).json({ error: 'company, passwordRecoveryCode, schedules, services, and employees are required' });

        const { username, password } = company;

        if (!username || !password) 
            return res.status(400).json({ error: 'username and password are required in company data' });

        const existing = await findUserByUsername(username.toLowerCase());
        if (existing)
            return res.status(409).json({ error: 'username already registered' });

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const recoveryHash = await bcrypt.hash(passwordRecoveryCode, BCRYPT_ROUNDS);
        var response = await createUser(username.toLowerCase(), passwordHash, company, recoveryHash);

        if(!response.success)
            return res.status(500).json({ error: response.error });

        const localId = response.localId;

        response = await setSchedules(localId, schedules);

        if(!response.success) {
            await deleteUser(localId);
            return res.status(500).json({ error: response.error  });
        }
            
        response = await setServices(localId, services);
        if(!response.success) {
            await deleteUser(localId);
            return res.status(500).json({ error: response.error  });
        }

        response = await setEmployees(localId, employees);

        if(!response.success) {
            await deleteUser(localId);
            return res.status(500).json({ error: response.error  });
        }

        response = await updateEmployeeCount(localId);

        if(!response.success) {
            await deleteUser(localId);
            return res.status(500).json({ error: response.error  });
        }
        
        response = await createOpenRouterApiKey(localId); // Si falla, no se detiene el registro, pero no se asigna la clave de OpenRouter

        if(response.success) {
            const openRouterKey = response.key;
            await setOpenRouterKeyByLocalId(localId, openRouterKey);
        }

        return res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Signup error:', err });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) 
            return res.status(400).json({ error: 'username and password are required' });

        const user = await findUserByUsername(username.toLowerCase());
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ error: 'Invalid username or password' });

        const token = jwt.sign(
            { localId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        return res.status(200).json({ token });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login error', details: err.message });
    }
});

router.get('/get_local_by_name', async (req, res) => {
    try {
        const { username } = req.query;

        if (!username) 
            return res.status(400).json({ error: 'username is required' });

        const user = await findUserByUsername(username.toLowerCase());
        if (!user) return res.status(200).json({ localData: false });

        return res.status(200).json({ localData: true });
    } catch (err) {
        console.error('Get local by name error:', err);
        return res.status(500).json({ error: 'Get local by name error', details: err.message });
    }
});

router.post('/verify_password_recovery_code', async (req, res) => {
    try {
        const { username, passwordRecoveryCode } = req.body;

        if (!username || !passwordRecoveryCode) 
            return res.status(400).json({ error: 'username and passwordRecoveryCode are required' });

        const user = await findUserByUsername(username.toLowerCase());
        if (!user) return res.status(404).json({ error: 'User not found' });

        const codeMatch = await bcrypt.compare(passwordRecoveryCode, user.password_recovery_code);
        if (!codeMatch) return res.status(401).json({ error: 'Invalid password recovery code' });

        return res.status(200).json({ message: 'Password recovery code verified successfully' });
    } catch (err) {
        console.error('Verify password recovery code error:', err);
        return res.status(500).json({ error: 'Verify password recovery code error', details: err.message });
    }
});

router.post('/reset_password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;

        if (!username || !newPassword) 
            return res.status(400).json({ error: 'username and newPassword are required' });

        const user = await findUserByUsername(username.toLowerCase());
        if (!user) return res.status(404).json({ error: 'User not found' });

        const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        user.password = newPasswordHash;

        const response = await setNewPassword(user.id, newPasswordHash);
        if (!response.success) 
            return res.status(500).json({ error: response.error });

        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Reset password error', details: err.message });
    }
});


module.exports = router;
