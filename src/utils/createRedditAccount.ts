import fs from 'fs/promises'
import os from 'os'
import { Browser, Page } from 'puppeteer'
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

export type UserDetails = {
    username: string
    password: string
}

const DEFAULT_BROWSER_CONFIG = {
    headless: false,
}
const DEFAULT_EMAIL = 'changeme@gmail.com'
const RANDOM_STRING_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const USERNAME_SELECTOR = '#regUsername'
const PASSWORD_SELECTOR = '#regPassword'
const SIGNUP_BUTTON_SELECTOR = '.SignupButton'
const CHECK_USERNAME_URL = 'https://www.reddit.com/check_username'

export async function createRedditAccount(email: string = DEFAULT_EMAIL): Promise<void> {
    const browser = await setupBrowser()
    const page = await browser.newPage()

    try {
        await navigateToRedditSignup(page)
        const newEmail = createAliasEmail(email)

        await inputEmail(page, newEmail)
        await submitEmailForm(page)

        const loginDetails = createLoginDetails()
        await inputLoginDetails(page, loginDetails)
        await appendToCSV(loginDetails)
    } catch (error) {
        console.error('Error during Reddit account creation:', error)
    } finally {
        await browser.close()
    }
}

async function setupBrowser(): Promise<Browser> {
    puppeteerExtra.use(StealthPlugin())
    return puppeteerExtra.launch(DEFAULT_BROWSER_CONFIG)
}

async function navigateToRedditSignup(page: Page): Promise<void> {
    await page.goto('https://www.reddit.com/account/register/', { waitUntil: 'networkidle2' })
}

function createAliasEmail(email: string): string {
    const [localPart, domain] = email.split('@')
    if (!localPart || !domain) {
        throw new Error('Invalid email provided.')
    }

    const randomString = generateRandomString(6)
    return `${localPart}+${randomString}@${domain}`
}

function generateRandomString(length: number): string {
    return Array.from({ length })
        .map(() => RANDOM_STRING_CHARS[Math.floor(Math.random() * RANDOM_STRING_CHARS.length)])
        .join('')
}

async function inputEmail(page: Page, email: string): Promise<void> {
    const emailInput = await page.$('#regEmail')
    if (!emailInput) throw new Error('Email input field not found.')
    await emailInput.type(email)
}

async function submitEmailForm(page: Page): Promise<void> {
    await page.click(
        'button.AnimatedForm__submitButton.m-full-width[data-step="email"][type="submit"]'
    )
}

function createLoginDetails(): UserDetails {
    return {
        username: generateRandomString(8),
        password: generateRandomString(8),
    }
}

async function inputLoginDetails(page: Page, details: UserDetails): Promise<void> {
    const usernameInput = await page.$(USERNAME_SELECTOR)
    if (!usernameInput) throw new Error('Username input field not found.')
    await usernameInput.type(details.username, { delay: 100 })
    await page.keyboard.press('Enter')

    await page.waitForResponse(
        (response) => response.url() === CHECK_USERNAME_URL && response.status() === 200
    )

    const passwordInput = await page.$(PASSWORD_SELECTOR)
    if (!passwordInput) throw new Error('Password input field not found.')
    await passwordInput.type(details.password, { delay: 100 })

    await page.click(SIGNUP_BUTTON_SELECTOR)
}

async function appendToCSV(details: UserDetails): Promise<void> {
    const csvLine = `${details.username},${details.password}${os.EOL}`
    await fs.appendFile('details.csv', csvLine)
}

export {
    setupBrowser,
    navigateToRedditSignup,
    inputEmail,
    submitEmailForm,
    createLoginDetails,
    inputLoginDetails,
    appendToCSV,
    generateRandomString,
    createAliasEmail,
}
