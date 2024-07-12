const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const Task = require('../models/task')

router.post('/tasks', auth, async (req, res) => {
    try {
        const task = new Task({ ...req.body, owner: req.user._id })
        await task.save()
        res.status(201).send(task)
    } catch (err) {
        res.status(400).send(err.message)
    }
})

router.get('/tasks', auth, async (req, res) => {

    const match = {}

    if (req.query.completed) {
        match.completed = req.query.completed === 'true'
    }

    const sort = {}

    if (req.query.sortBy) {

        const sortBy = req.query.sortBy.split(':')[0]
        const order = req.query.sortBy.split(':')[1]
        sort[sortBy] = order === 'desc' ? 1 : -1
    }

    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        })

        res.send(req.user.tasks)
    } catch (e) {
        res.status(400).send(e.message)
    }
})

router.get('/tasks/:id', auth, async (req, res) => {
    const id = req.params.id
    try {
        const task = await Task.findOne({ _id: id, owner: req.user._id })

        if (!task) {
            res.send(404)
        }

        res.send(task)
    } catch (err) {
        res.status(400).send(err.message)
    }
})

router.patch('/tasks/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowed = ['description', 'completed']
    const isValid = updates.every((value) => allowed.includes(value))

    if (!isValid) {
        return res.status(400).send({ error: 'not allowed to update this field' })
    }

    try {
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })

        if (!task) {
            res.status(404).send('task not found')
        }

        updates.forEach(update => task[update] = req.body[update])
        await task.save()

        res.send(task)
    } catch (err) {
        res.status(400).send(err.message)
    }
})

router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })

        if (!task) {
            return res.status(404).send('task not found')
        }

        res.send('Task deleted')

    } catch (e) {
        res.status(400).send(e.message)

    }
})

module.exports = router