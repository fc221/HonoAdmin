import { createRoute } from 'honox/factory'
import Counter from '../_components/$counter'
import Layout from '../_components/_layout/$index'

export default createRoute((c) => {
  const name = c.req.query('name') ?? 'Hono'
  return c.render(
    <Layout>
      <div class="py-8 text-center">
        <title>{name}</title>
        <h1 class="text-3xl font-bold">
          Hello,
          {name}
          !
        </h1>
        <Counter />
      </div>
    </Layout>,
  )
})
