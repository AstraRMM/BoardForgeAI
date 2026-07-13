#!/usr/bin/env node
import { randomBytes } from 'node:crypto'

// Intentionally print only the newly generated value so it can be pasted directly into Vercel.
console.log(randomBytes(64).toString('base64'))
