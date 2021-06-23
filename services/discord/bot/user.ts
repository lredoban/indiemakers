import dayjs from 'dayjs'
import admin from 'firebase-admin'
import {
  ApplicationCommandInteractionDataOption,
  Interaction,
} from '../command'
import {
  Embed,
  embed,
  getFields,
  getUserData,
  getUserUrl,
  image,
  l3s,
  Langs,
  lastDay,
  LName,
  openChannel,
  sendChannel,
  sendTxtLater,
  t9r,
  transformKey,
  transformVal,
} from './utils'
import { Project } from './project'

export interface User {
  userId: string
  avatar: string
  username: string
  avatarUrl: string
  onboardingSend: boolean
  taskReminder: string
  mondayReminder: string
  voiceReminder: string
  streak: number
  bestStreak: number
  karma: number
  projects: number
  incomes: number
  tasks: number
  emoji?: string
  skills?: string
  color?: string
  name?: string
  bio?: string
  twitter?: string
  github?: string
  autoTranslate?: boolean
  makerlog?: string
  wip?: string
  nomadlist?: string
  cover?: string
  website?: string
  lastTaskAt?: string
  makerlogHook?: string
  wipApiKey?: string
  projectsData?: Project[]
  createdAt: string
  updatedAt: string
}
const userPublicFlieds = [
  'karma',
  'streak',
  'tasks',
  'projects',
  'website',
  'skills',
  'twitter',
  'wip',
  'makerlog',
  'nomadlist',
  'cover',
]
const userConfidentialKey = [
  'makerlogHook',
  'wipApiKey',
  'taskReminder',
  'mondayReminder',
  'voiceReminder',
]
const userProtectedKey = [
  'userId',
  'username',
  'onboardingSend',
  'autoTranslate',
  'karma',
  'avatar',
  'tasks',
  'projects',
  'streak',
  'bestStreak',
  'createdAt',
  'updatedAt',
  'lastTaskAt',
]
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const documents = await admin.firestore().collection('/discord').get()
    const users: User[] = []
    documents.docs.forEach((doc) => {
      const data: User = doc.data() as User
      if (data !== undefined) {
        users.push(data)
      }
    })
    return users
  } catch (err) {
    console.error('getAllUsers', err)
    return []
  }
}

const transforms: Langs[] = [
  t9r('color', 'couleur', 'Couleur'),
  t9r('name', 'nom', 'Nom'),
  t9r(
    'cover',
    'couverture',
    l3s('Couverture', (d) => (d ? 'Configuré' : 'Pas configuré'))
  ),
  t9r(
    'taskReminder',
    'rappel_tache',
    l3s('Rappel journalier de tache', (d) => (d === 'true' ? 'Oui' : 'Non'))
  ),
  t9r('mondayReminder', 'rappel_lundi', 'Rappel du résumé du lundi'),
  t9r('voiceReminder', 'rappel_vocal', 'Rappel du vocal mensuel'),
  t9r('makerlogHook', 'makerlog_hook', 'Makerlog webhook', undefined, false),
  t9r('nomadlist', 'nomadlist', 'nomadlist', undefined, false),
  t9r('wip', 'wip', 'wip.co', undefined, false),
  t9r('makerlog', 'makerlog', 'getmakerlog.com', undefined, false),
  t9r('wipApiKey', 'wip_key', 'WIP clé API', undefined, false),
  t9r('avatarUrl', 'photo', 'Photo', undefined, false),
  t9r('website', 'website', 'Site web', undefined, false),
  t9r('github', 'github', 'Github', undefined, false),
  t9r('twitter', 'twitter', 'Twitter', undefined, false),
  t9r('skills', 'talents', 'Talents'),
  t9r('streak', 'flammes', '🔥 Flammes'),
  t9r('karma', 'karma', '🕉 Karma'),
  t9r('projects', 'projets', '🌱 Projets'),
  t9r('tasks', 'taches', '💗 Taches'),
]

export const getUsersById = async (userId: string): Promise<User | null> => {
  try {
    const res = await admin.firestore().collection('/discord').doc(userId).get()
    const data = res.data()
    return data !== undefined ? (data as User) : null
  } catch (err) {
    console.error('getUsersById', err)
    return null
  }
}

export const getUsersByUsername = async (
  username: string
): Promise<User | null> => {
  try {
    const snapshot = await admin
      .firestore()
      .collection('/discord')
      .where('username', '==', username)
      .get()
    let data
    snapshot.forEach((doc) => {
      data = doc.data()
    })
    return data !== undefined ? (data as User) : null
  } catch (err) {
    console.error('getUsersById', err)
    return null
  }
}

export const updateUser = async (
  userId: string,
  user: Partial<User>
): Promise<User> => {
  const userDoc = await admin
    .firestore()
    .collection('/discord')
    .doc(userId)
    .get()
  if (!userDoc.exists) {
    const userInfo = await getUserData(userId)
    const base: User = {
      userId,
      avatar: '',
      avatarUrl: '',
      streak: 0,
      bestStreak: 0,
      taskReminder: 'true',
      onboardingSend: false,
      mondayReminder: 'true',
      autoTranslate: true,
      voiceReminder: 'false',
      incomes: 0,
      karma: 0,
      projects: 0,
      tasks: 0,
      username: '',
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    }
    if (userInfo) {
      if (userInfo.avatar) {
        base.avatar = userInfo.avatar
        base.avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${userInfo.avatar}.png`
      } else {
        base.avatarUrl =
          'https://res.cloudinary.com/forgr/image/upload/v1621079734/indiemakers/cover-im_no_gjzhog.jpg'
      }
      base.username = userInfo.username
    }
    const newUser: User = Object.assign(base, user as User)
    await admin.firestore().collection('discord').doc(userId).set(newUser)
    return newUser
  }
  await userDoc.ref.update({ ...user, updatedAt: dayjs().toISOString() })
  return userDoc.data() as User
}

const userEdit = (
  interaction: Interaction,
  options: ApplicationCommandInteractionDataOption[],
  userId: string
): Promise<void> => {
  const update: Partial<User> = {
    updatedAt: dayjs().toISOString(),
  }
  options.forEach((element: ApplicationCommandInteractionDataOption) => {
    const key = transformKey(
      transforms,
      element.name,
      LName.discord,
      LName.database
    )
    if (!userProtectedKey.includes(key)) {
      ;(update as any)[key] = transformVal(
        transforms,
        element.name,
        element.value,
        LName.discord,
        LName.database
      )
    }
  })
  console.error('userEdit', update)
  return Promise.all([
    updateUser(userId, update),
    sendTxtLater(
      `Tu as mis a jour ton profil !
Cela aidera les autres makers 👨‍🌾 à te connaitre !`,
      [],
      interaction.application_id,
      interaction.token
    ),
  ]).then(() => Promise.resolve())
}

const userCard = (user: User) => {
  const fields = getFields(user, userPublicFlieds, transforms)
  const name = `${user.emoji || '👨‍🌾'} ${user.name || user.username}`
  const bio = user.bio || 'Indie Maker en devenir !'
  const thumb = image(user.avatarUrl)
  return embed(
    name,
    bio,
    user.color,
    fields,
    undefined,
    undefined,
    user.createdAt,
    getUserUrl(user),
    thumb
  )
}

export const usersViewStreak = (usrs: User[]): Embed[] => {
  const embeds: Embed[] = []
  const limitStreak = lastDay()
  let users = usrs.sort(
    (firstEl: User, secondEl: User) => secondEl.streak - firstEl.streak
  )
  users = users.filter((user: User) =>
    user.lastTaskAt ? dayjs(user.lastTaskAt).isAfter(limitStreak) : false
  )
  users.forEach((user: User) => {
    if (embeds.length < 10) {
      embeds.push(userCard(user))
    }
  })
  return embeds
}

const userList = async (interaction: Interaction): Promise<void> => {
  const users = await getAllUsers()
  await sendTxtLater(
    'Voici la liste des makers:',
    [],
    interaction.application_id,
    interaction.token
  )
  for (let index = 0; index < users.length; index++) {
    const user = users[index]
    const card = userCard(user)
    // console.error('card', card)
    await sendChannel(interaction.channel_id, '', card)
  }
  console.error('userList')
  return Promise.resolve()
}

const userListStreak = async (interaction: Interaction): Promise<void> => {
  const users = await getAllUsers()
  const usersInfoCards = usersViewStreak(users)
  console.error('userList', usersInfoCards)
  if (usersInfoCards.length > 0) {
    await sendTxtLater(
      `Voici la liste des 10 premiers makers avec les flammes 🔥 :`,
      [],
      interaction.application_id,
      interaction.token
    )
    for (let index = 0; index < usersInfoCards.length; index++) {
      const card = usersInfoCards[index]
      // console.error('card', card)
      await sendChannel(interaction.channel_id, '', card)
    }
    return Promise.resolve()
  } else {
    return sendTxtLater(
      `Les makers n'ont plus de flamme 😢!`,
      [],
      interaction.application_id,
      interaction.token
    )
  }
}

const userView = async (
  interaction: Interaction,
  myId: string,
  userId: string | undefined
): Promise<void> => {
  const user = await getUsersById(userId || myId)
  if (user && userId && myId !== userId) {
    console.error('userView', userId)
    await sendTxtLater(
      `Voici les infos sur ce maker :`,
      [userCard(user)],
      interaction.application_id,
      interaction.token
    )
    return sendChannel(
      interaction.channel_id,
      `Tu peux aussi voir toute les infos sur la page publique : ${getUserUrl(
        user
      )}`
    )
  } else if (user) {
    console.error('userView', userId)
    const card = userCard(user)
    const fields = getFields(user, userConfidentialKey, transforms)
    if (card.fields) card.fields.push(...fields)
    await sendTxtLater(
      'Voici tes infos',
      [userCard(user)],
      interaction.application_id,
      interaction.token
    )
    await sendChannel(
      interaction.channel_id,
      `Je t'ai envoyé plus info en privé 🤫`
    )
    await sendChannel(
      interaction.channel_id,
      `Tu peux aussi voir toute les infos sur la page publique : ${getUserUrl(
        user
      )}`
    )
    await openChannel(myId).then((channel) => {
      console.error('channel', channel)
      return sendChannel(channel.id, `Voici tes infos complètes :`, card)
    })
    return Promise.resolve()
  }
  return sendTxtLater(
    `Je ne trouve pas <@${userId}>`,
    [],
    interaction.application_id,
    interaction.token
  )
}

export const userFn = (
  interaction: Interaction,
  option: ApplicationCommandInteractionDataOption,
  senderId: string
): Promise<void> => {
  if (
    option.name === 'modifier' &&
    option.options &&
    option.options.length > 0
  ) {
    return userEdit(interaction, option.options, senderId)
  }
  if (option.name === 'liste') {
    return userList(interaction)
  }
  if (option.name === 'flammes') {
    return userListStreak(interaction)
  }
  if (option.name === 'voir' && option.options && option.options.length > 0) {
    return userView(interaction, senderId, option.options[0].value)
  }
  if (option.name === 'voir') {
    return userView(interaction, senderId, undefined)
  }
  if (option.name === 'aide') {
    return sendTxtLater(
      `Voici ce que tu peut faire avec la commande maker:
  - **modifier** ( ton compte )
    - photo: L'url vers ta photo (avec https://)
    - emoji: Un emoji qui te représente
    - couverture: L'url vers ta photo de couverture
    - couleur: Une couleur en Hexa qui te ressemble
    - nom: Ton nom de scène !
    - bio: Ta bio, qui te décrit
    - website: L'url de ton site perso (avec https://)
    - github: L'url de ton github perso (avec https://)
    - makerlog: L'url de ton compte getmakerlog.com perso (avec https://)
    - wip: L'url de ton compte wip.co perso (avec https://)
    - twitter: L'url de ton compte twitter.com perso (avec https://)
    - nomadlist: L'url de ton compte nomadlist.com perso (avec https://)
    - makerlog_hook: L'url de ton webhook makerlog
    - wip_key: Ton api key pour connecter ton compte wip.co
  - **supprimer** ( ton compte )
    - hashtag: obligatoire
  - **voir** (voir un maker ou toi par default)
      - maker: optionnel
  - **liste** (lister les makers)
  `,
      [],
      interaction.application_id,
      interaction.token
    )
  }
  return sendTxtLater(
    `La Commande ${option.name} n'est pas pris en charge 🤫`,
    [],
    interaction.application_id,
    interaction.token
  )
}
