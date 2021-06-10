import { InteractionResponseType } from 'discord-interactions'
import { Response as Res } from 'express'
import axios from 'axios'
import { hexToDec } from 'hex2dec'
import admin from 'firebase-admin'
import dayjs from 'dayjs'
import { getAllUsers, usersViewStreak } from './user'
import { resetProjectStreak, resetUserStreak } from './tasks'
import { updateIncomeAllProject } from './stripe'
import { getAllAllProject } from './project'

interface DiscorUser {
  avatar: string
  username: string
}
export interface Field {
  name: string
  value: string
  inline: boolean
}
interface Author {
  name: string
  url?: string
  // eslint-disable-next-line camelcase
  icon_url?: string
}
interface Footer {
  text: string
  // eslint-disable-next-line camelcase
  icon_url: string
}

interface Image {
  url: string
}
export interface Embed {
  title?: string
  description?: string
  url?: string
  color?: string
  fields?: Field[]
  author?: Author
  footer?: Footer
  timestamp?: string
  thumbnail?: Image
  image?: Image
}
interface DiscordMessage {
  content: string
  embeds?: Embed[]
}

export const image = (url: string): Image => ({ url })
// eslint-disable-next-line camelcase
export const footer = (text: string, icon_url: string): Footer => ({
  text,
  icon_url,
})
export const author = (
  name: string,
  url: string,
  // eslint-disable-next-line camelcase
  icon_url: string
): Author => ({ name, url, icon_url })
export const field = (name: string, value: string, inline = true): Field => ({
  name,
  value,
  inline,
})
export const embed = (
  title: string | undefined = undefined,
  description: string | undefined = undefined,
  color: string | undefined = undefined,
  fields: Field[] = [],
  author: Author | undefined = undefined,
  footer: Footer | undefined = undefined,
  timestamp: string | undefined = undefined,
  url: string | undefined = undefined,
  thumbnail: Image | undefined = undefined,
  image: Image | undefined = undefined
): Embed => {
  const data: Embed = { fields }
  if (title && title !== '') {
    data.title = title
  }
  if (url && url !== '') {
    data.url = url
  }
  if (description && description !== '') {
    data.description = description
  }
  if (color && color !== '') {
    data.color = hexToDec(`0x${color}`) || undefined
  }
  if (timestamp && timestamp !== '') {
    data.timestamp = timestamp
  }
  if (footer) {
    data.footer = footer
  }
  if (author) {
    data.author = author
  }
  if (thumbnail) {
    data.thumbnail = thumbnail
  }
  if (image) {
    data.image = image
  }
  return data
}

export const sendTxt = (res: Res, text: string): Res =>
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: text,
    },
  })

export const getUserData = async (
  userId: string
): Promise<DiscorUser | undefined> => {
  const url = `https://discord.com/api/v8/users/${userId}`
  const data = (
    await admin.firestore().collection('bot').doc('config').get()
  ).data()
  if (!data) {
    return Promise.resolve(undefined)
  }
  const headers = {
    Authorization: `Bot ${
      process.env.BOT_TOKEN ? process.env.BOT_TOKEN : data.bot_token
    }`,
  }
  try {
    const res = await axios.get(url, { headers })
    return Promise.resolve(res.data as DiscorUser)
  } catch (err) {
    console.error('getUserData', err)
    return Promise.resolve(undefined)
  }
}

export const sendTxtLoading = (res: Res): Res =>
  res.send({
    type: InteractionResponseType.ACKNOWLEDGE_WITH_SOURCE,
    data: {
      content: 'Le bot réflechis..',
    },
  })

// eslint-disable-next-line no-unused-vars
export enum LName {
  // eslint-disable-next-line no-unused-vars
  fr = 'fr',
  // eslint-disable-next-line no-unused-vars
  en = 'en',
  // eslint-disable-next-line no-unused-vars
  database = 'db',
  // eslint-disable-next-line no-unused-vars
  discord = 'dc',
}

// eslint-disable-next-line no-unused-vars
type Tfunc = (val: string) => string
interface Lang {
  key: string
  value: Tfunc
}
type LLangs = {
  // eslint-disable-next-line no-unused-vars
  [key in LName]: Lang
}
export interface Langs extends LLangs {
  inline: boolean
}

const noneTFunc = (val: string): string => val

export const l3s = (key: string, value: Tfunc = noneTFunc): Lang => {
  return { key, value }
}

const stringOrLang = (key: string | Lang): Lang => {
  if (typeof key === 'string') {
    return l3s(key)
  }
  return key
}

export const t9r = (
  db: string | Lang,
  dc: string | Lang,
  fr: string | Lang | undefined = undefined,
  en: string | Lang | undefined = undefined,
  inline: boolean = true
): Langs => ({
  inline,
  db: stringOrLang(db),
  dc: stringOrLang(dc),
  fr: fr ? stringOrLang(fr) : stringOrLang(db),
  en: en ? stringOrLang(en) : stringOrLang(db),
})

export const transformKey = (
  transformers: Langs[],
  key: string,
  lang: LName,
  langRes: LName
): string => {
  const found = transformers.find((val: Langs) => val[lang].key === key)
  if (found) {
    return found[langRes].key
  }
  return key
}

export const transformInline = (
  transformers: Langs[],
  key: string,
  lang: LName
): boolean => {
  const found = transformers.find((val: Langs) => val[lang].key === key)
  if (found) {
    return found?.inline
  }
  return false
}

export const transformVal = (
  transformers: Langs[],
  key: string,
  value: string | undefined,
  lang: LName = LName.en,
  langRes: LName = LName.en
): string => {
  const found = transformers.find((val: Langs) => val[lang].key === key)
  if (found && value) {
    return found[langRes].value(value)
  }
  return value || ''
}

export const getFields = (
  obj: object,
  publicFields: string[],
  transformers: Langs[]
) => {
  const fields: Field[] = []
  publicFields.forEach((key) => {
    if ((obj as any)[key]) {
      fields.push(
        field(
          transformKey(transformers, key, LName.database, LName.fr),
          transformVal(transformers, key, (obj as any)[key]),
          transformInline(transformers, key, LName.database)
        )
      )
    }
  })
  return fields
}

export const sendTxtLater = async (
  content: string,
  embeds: Embed[] = [],
  applicationId: string,
  interactionToken: string
): Promise<void> => {
  const url = `https://discord.com/api/v8/webhooks/${applicationId}/${interactionToken}/messages/@original`
  const body: DiscordMessage = {
    content,
    embeds,
  }
  try {
    const res = await axios.patch(url, body)
    return res.data
  } catch (err) {
    if (err.response) {
      // Request made and server responded
      console.error('sendTxtLater response', err.response.data)
      console.error('sendTxtLater response status', err.response.status)
      console.error(
        'sendTxtLater response errors',
        err.response.data.errors.content
      )
      // console.error(err.response.headers)
    } else if (err.request) {
      // The request was made but no response was received
      console.error('sendTxtLater request', err.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('sendTxtLater Error', err.message)
    }
    // console.error('sendTxtLater content', url, JSON.stringify(content))
    const res = await axios
      .patch(url, { content: "🤖 Oups, previens mon créateur j'ai un bug!" })
      .catch((errErr) => {
        console.error('sendTxtLaterFallback', err.response, errErr.response)
        return admin
          .firestore()
          .collection('errors')
          .add(err)
          .then(() => err)
      })
    await admin
      .firestore()
      .collection('errors')
      .add({ function: 'sendTxtLater', url, error: JSON.stringify(err) })
      .then(() => err)
    return res
  }
}

export const openChannel = async (userId: string): Promise<any> => {
  const url = 'https://discord.com/api/v8/users/@me/channels'
  const data = (
    await admin.firestore().collection('bot').doc('config').get()
  ).data()
  if (!data) {
    return Promise.resolve(undefined)
  }
  const headers = {
    Authorization: `Bot ${
      process.env.BOT_TOKEN ? process.env.BOT_TOKEN : data.discord.bot_token
    }`,
  }
  if (data.discordResetAfter && data.discordResetAfter > 0) {
    console.error('Sleep a bit', data.discordResetAfter)
    await sleep(data.discordResetAfter)
  }
  const res = await axios
    .post(url, { recipient_id: userId }, { headers })
    .then(async (res) => {
      if (
        res?.headers['x-ratelimit-reset-after'] &&
        !res?.headers['x-ratelimit-remaining']
      ) {
        await saveRateLimit(res.headers['x-ratelimit-reset-after'])
      } else if (data.discordResetAfter && data.discordResetAfter > 0) {
        await saveRateLimit(0)
      }
      return res.data
    })
    .catch(async (err) => {
      if (err.response) {
        if (err.response.headers['x-ratelimit-reset-after']) {
          await saveRateLimit(err.response.headers['x-ratelimit-reset-after'])
        }
      }
      return admin
        .firestore()
        .collection('errors')
        .add({
          function: 'openChannel',
          headers,
          userId,
          url,
          error: JSON.stringify(err),
        })
        .then(() => err)
    })
  return res
}
// https://discord.com/api/webhooks/841492487125598218/b0Rvbv41Uy2w6UxUutctXYeKYd0QAXOKnjhgCOTOyfjSs9hgpYOPxjizWiu4vi-s17nX
export const sleep = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const saveRateLimit = (limit: string | number) => {
  console.error('sendChannel x-ratelimit-reset-after', limit)
  return admin
    .firestore()
    .collection('bot')
    .doc('config')
    .update({
      discordResetAfter: Number(limit) * 1000,
    })
}

const personalReminder = async () => {
  const users = await getAllUsers()
  await Promise.all(
    users.map((usr) => {
      if (usr.taskReminder && usr.taskReminder === 'true' && usr.streak > 0) {
        return openChannel(usr.userId).then((channel) => {
          console.error('personalReminder', usr.userId)
          return sendChannel(
            channel.id,
            `Tu as actuellement ${usr.streak} 🔥 !
Si tu veux les conserver, fait une tache aujourd'hui sur tes projet même 5 min, ça compte !
5*365/60 = 30 heures sur ton projet a la fin de l'année ❤️`
          )
        })
      } else {
        return Promise.resolve()
      }
    })
  )
}

export const getConfig = async () => {
  const res = await admin.firestore().collection('bot').doc('config').get()
  const data = res.data()
  return data
}

export const lateBot = async () => {
  const data = await getConfig()
  if (data) {
    await sendChannel(
      data.channel_bip,
      "Hey Makers, il est temps de noter vos taches dans vos projets et d'aller chill !"
    )
    await personalReminder()
  }
}

export const morningBot = async () => {
  const data = await getConfig()
  if (data) {
    const users = await getAllUsers()
    const projects = await getAllAllProject(users)
    const updatedUsers = await Promise.all(
      users.map((usr) => {
        return resetUserStreak(usr)
      })
    )
    await Promise.all(
      projects.map((proj) => {
        return resetProjectStreak(proj.userId, proj)
      })
    )
    const usersInfoCards = usersViewStreak(updatedUsers)
    if (usersInfoCards.length > 0) {
      await sendChannel(
        data.channel_bip,
        `Hey Makers, Encore une belle journée pour shipper 🚤 !

  Continuez comme ça :`
      )
      for (let index = 0; index < usersInfoCards.length; index++) {
        const card = usersInfoCards[index]
        // console.error('card', card)
        await sendChannel(data.channel_bip, '', card)
      }
    } else {
      await sendChannel(
        data.channel_bip,
        `Hey Makers, Personne n'as shipper 🚤 cette semaine 😢 !`
      )
    }
    if (dayjs().day() === 1) {
      await sendChannel(
        data.channel_general,
        `Hey Makers, Faites moi un petit récap de votre semaine passé MINIMUM :
  - **1 point 👍**
  - **1 point 👎**`
      )
      await updateIncomeAllProject()
    }
  }
}

export const sendChannel = async (
  channelId: string,
  content: string,
  embed: Embed | undefined = undefined
): Promise<any> => {
  const url = `https://discord.com/api/v8/channels/${channelId}/messages`
  const data = (
    await admin.firestore().collection('bot').doc('config').get()
  ).data()
  if (!data) {
    return Promise.resolve(undefined)
  }

  const headers = {
    Authorization: `Bot ${
      process.env.BOT_TOKEN ? process.env.BOT_TOKEN : data.discord.bot_token
    }`,
  }
  const body: any = { content }
  if (embed) {
    body.embed = embed
  }
  if (data.discordResetAfter && data.discordResetAfter > 0) {
    console.error('Sleep a bit', data.discordResetAfter)
    await sleep(data.discordResetAfter)
  }
  const res = await axios
    .post(url, body, { headers })
    .then(async (res) => {
      if (
        res?.headers['x-ratelimit-reset-after'] &&
        !res?.headers['x-ratelimit-remaining']
      ) {
        await saveRateLimit(res.headers['x-ratelimit-reset-after'])
      } else if (data.discordResetAfter && data.discordResetAfter > 0) {
        await saveRateLimit(0)
      }
      return res.data
    })
    .catch(async (err) => {
      if (err.response) {
        if (err.response.headers['x-ratelimit-reset-after']) {
          await saveRateLimit(err.response.headers['x-ratelimit-reset-after'])
        }
      }
      return admin
        .firestore()
        .collection('errors')
        .add({
          function: 'sendChannel',
          headers,
          body,
          url,
          error: JSON.stringify(err),
        })
        .then(() => err)
    })
  return res
}
