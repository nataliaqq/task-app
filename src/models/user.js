const mongoose = require('mongoose');
const validate = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('../models/task')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        default: 0,
    },
    password: {
        type: String,
        require: true,
        trim: true,
        validate(value) {
            if (value.length < 6) {
                throw new Error('password should be more than 6 car.')
            }
            if (value.includes('password')) {
                throw new Error('password should not be password word')
            }
        }
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate (value) {
            if (!validate.isEmail(value)) {
                throw new Error('not email')
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    profilePic: {
        type: Buffer
    }
}, {
    timestamps: true
})

userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.generateAuthToken = async function () {
    const user = this

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET)

    user.tokens = user.tokens.concat({ token })
    await user.save()

    return token
}

userSchema.methods.toJSON = function () {
    const user = this

    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.profilePic

    return userObject
}

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email })
    if (!user) {
        throw new Error('user not found')
    }

    const isMatch = await bcryptjs.compare(password, user.password)

    if (!isMatch) {
        throw new Error('incorrect password')
    }

    return user
}

userSchema.pre('save', async function () {
    const user = this
    if (user.isModified('password')) {
        const hashedPassword = await bcryptjs.hash(user.password, 8)
        user.password = hashedPassword
    }
})

userSchema.pre('deleteOne', { document: true }, async function () {
    const user = this
    await Task.deleteMany({ owner: user._id })
})

const User = mongoose.model('User', userSchema)

module.exports = User
