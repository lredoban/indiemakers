import { Request, Response } from 'express'
import fFnit from '../../services/firebase/init'
import dayjs from './../../services/dayjs'
import { getAllUsers } from '../../services/firebase/discord'
import { getAllAllPosts } from '../../services/firebase/posts'

const list = async (_req: Request, res: Response) => {
  fFnit()
  const users = await getAllUsers()
  const posts = await getAllAllPosts(users)
  posts.sort((a, b) => (a.createdAt < b.createdAt === true ? 1 : -1))
  posts.map((post) => {
    post.createdAt = dayjs(post.createdAt).fromNow()
    return post
  })
  return res.json(posts)
}

export default list
