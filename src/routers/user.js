const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const multer = require('multer')
const User = require('../models/user')
const sharp = require('sharp');

router.post('/users', async (req, res) => {
    const user = new User(req.body)

    try {
        await user.save()

        const token = await user.generateAuthToken()

        res.status(201).send({ user, token })
    } catch(err) {
        res.status(400).send(err.message)
    }
})

router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()

        res.status(201).send({ user, token })
    } catch(err) {
        res.status(400).send({
            error: err.message,
        })
    }
})

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter(token => token.token !== req.token)
        await req.user.save()

        res.send(200)
    } catch (e) {
        res.status(400).send({
            error: e.message,
        })
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()

        res.send(200)
    } catch (e) {
        res.status(400).send({
            error: e.message,
        })
    }
})

router.get('/users/me', auth, async (req, res) => {
    try {
        res.send(req.user)
    } catch (e) {
        res.status(400).send(e.message)
    }
})

router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowed = ['name', 'age', 'email', 'password']
    const isValid = updates.every((value) => allowed.includes(value))

    if (!isValid) {
        return res.status(400).send({ error: 'not allowed to update this field' })
    }

    try {
        updates.forEach(update => req.user[update] = req.body[update])

        await req.user.save()

       res.send(req.user)
    } catch (err) {
        res.status(400).send(err.message)
    }
})

router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.deleteOne()
        res.send(200)
    } catch (e) {
        res.status(400).send(e.message)
    }
})

const upload = multer({
    limits: {
        fileSize: 1000000,
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/)) {
            return cb(new Error('file should be jpeg, jpeg or png'))
        }

        cb(null, true)
    }
})

router.post('/users/me/avatar', auth, upload.single('profile'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.profilePic = buffer
    await req.user.save()
    res.status(200).send('ok')
}, (error, req, res, next) => {
    res.status(400).send(error.message)
})

router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.profilePic = undefined
    try { 
        await req.user.save()
        res.status(200).send('ok')
    } catch (e) {
        res.status(400).send(e.message)
    }
})

router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)

        if (!user || !user.profilePic) {
            throw new Error()
        }
        res.set('Content-Type', 'image/png')
        res.send(user.profilePic)
    } catch (e) {
        res.status(404).send(e.message)
    }
})

module.exports = router