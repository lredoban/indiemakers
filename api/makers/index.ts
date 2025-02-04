import { Request, Response } from 'express'
import { getAllUsers, getUsersByUsername } from '../../services/firebase/discord'
import { getAllPosts } from '../../services/firebase/posts'
import { getAllProjects } from '../../services/discord/bot/project'
import fFnit from '../../services/firebase/init'

const makers = async (req: Request, res: Response) => {
  fFnit()
  if (req?.query?.id) {
    const user = await getUsersByUsername(String(req.query.id))
    const projects = await getAllProjects(String(user?.userId), user?.username)
    const posts = user ? await getAllPosts(user) : []
    if (user) {
      user.projectsData = projects
      user.postsData = posts
      ;(user as any).makerlogHook = !!user.makerlogHook
      ;(user as any).wipApiKey = !!user.wipApiKey
    }
    res.json(user)
  } else {
    const users = await getAllUsers()
    users.forEach((user) => {
      user.makerlogHook = ''
      user.wipApiKey = ''
    })
    return res.json(users)
  }
}
export default makers
