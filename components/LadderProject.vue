<template>
  <div class="w-full pt-5">
    <div class="w-11/12 w-full mx-auto mb-3 text-right text-white">
      <label for="sort-select">Top Projets par:</label>
      <select
        id="sort-select"
        v-model="sort"
        name="sort"
        class="border rounded bg-royalblue-700 border-orchid-300"
      >
        <option value="streak">🔥</option>
        <option value="tasks">💗</option>
        <option value="incomes">💰</option>
      </select>
    </div>
    <div
      class="
        w-11/12 w-full
        px-5
        py-5
        mx-auto
        overflow-y-auto
        border-4
        bg-gray-50
        text-royalblue-700
        border-orchid-300
        h-60
      "
    >
      <div
        v-for="project in sorted()"
        :key="`{project.userName}_${project.hashtag}`"
        class="flex py-3 border-b-2 cursor-pointer border-orchid-300"
        @click="openProject(project.userName, project.hashtag)"
      >
        <img
          class="object-cover w-12 h-12 border-2 rounded-full border-orchid-300"
          :src="project.logo || noImge"
          alt="cover profil"
        />
        <div class="flex flex-col mx-3">
          <h1 class="text-lg font-medium" :style="getTextColor(project.color)">
            {{ project.emoji || '' }} {{ project.name || project.hashtag }}
          </h1>
          <div class="flex text-sm">
            <p class="px-2 mx-2 bg-white rounded text-royalblue-700">
              🔥{{ project.streak }}
            </p>
            <p class="px-2 mx-2 bg-white rounded text-royalblue-700">
              💗 {{ project.tasks }}
            </p>
            <p class="px-2 mx-2 bg-white rounded text-royalblue-700">
              💰 {{ project.incomes }} €
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, useRouter } from '@nuxtjs/composition-api'
import { Project } from '~/services/types'

export default defineComponent({
  props: {
    projects: { type: Array as () => Project[], default: () => [] },
  },
  setup({ projects }) {
    const router = useRouter()
    const noImge =
      'https://res.cloudinary.com/forgr/image/upload/v1621441258/indiemakers/cover-im_unknow_ukenjd.jpg'
    const sort = ref('tasks')
    const sorted = () =>
      projects
        .slice()
        .sort((a, b) => (b as any)[sort.value] - (a as any)[sort.value])
    const getTextColor = (color: string | undefined) => {
      if (color) {
        return { color: `#${color}` }
      }
      return {}
    }
    const openProject = (id: string | undefined, hashtag: string) => {
      if (id) router.push(`/makers/${encodeURI(id)}/projets/${hashtag}`)
    }
    return { sort, sorted, getTextColor, openProject, noImge }
  },
})
</script>
<style scoped>
select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23df99d8'><polygon points='0,0 100,0 50,50'/></svg>")
    no-repeat;
  background-size: 12px;
  background-position: calc(100% - 10px) center;
  background-repeat: no-repeat;
  width: 50px;
}
</style>
