export default function getAPIData() {
  return [
    {
      path: '/',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/app.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts'
      ],
      childrenFilePaths: [ '/home/joeldemort/dev/shipwriter/backend/src/app.service.ts' ]
    },
    {
      path: '/liveness',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/app.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts'
      ],
      childrenFilePaths: [ '/home/joeldemort/dev/shipwriter/backend/src/app.service.ts' ]
    },
    {
      path: '/readiness',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/app.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts'
      ],
      childrenFilePaths: [ '/home/joeldemort/dev/shipwriter/backend/src/app.service.ts' ]
    },
    {
      path: '/api/v1/auth',
      method: 'POST',
      group: 'auth',
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/auth/register',
      method: 'POST',
      group: 'auth',
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/users/register',
      method: 'POST',
      group: 'auth',
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/users/users.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.types.ts'
      ]
    },
    {
      path: '/api/v1/users/goal',
      method: 'PUT',
      group: 'auth',
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/users/users.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.types.ts'
      ]
    },
    {
      path: '/api/v1/users/me',
      method: 'GET',
      group: 'auth',
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/users/users.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.types.ts'
      ]
    },
    {
      path: '/api/v1/writing/metrics',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/word-count.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.types.ts'
      ]
    },
    {
      path: '/api/v1/writing',
      method: 'POST',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/word-count.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.types.ts'
      ]
    },
    {
      path: '/api/v1/writing',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/word-count.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.types.ts'
      ]
    },
    {
      path: '/api/v1/writing/:id',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/word-count.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.types.ts'
      ]
    },
    {
      path: '/api/v1/writing/:id',
      method: 'PUT',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/word-count.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.types.ts'
      ]
    },
    {
      path: '/api/v1/characters/tags',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/characters',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/characters/:id',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/characters',
      method: 'POST',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/characters/:id',
      method: 'PUT',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/characters/:id',
      method: 'DELETE',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/characters/:id/image',
      method: 'POST',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/characters/:id/voice',
      method: 'POST',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ]
    },
    {
      path: '/api/v1/beta-reads',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.types.ts'
      ]
    },
    {
      path: '/api/v1/beta-reads/:id',
      method: 'GET',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.types.ts'
      ]
    },
    {
      path: '/api/v1/beta-reads/:id',
      method: 'POST',
      group: undefined,
      filePath: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.controller.ts',
      parentFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.module.ts'
      ],
      childrenFilePaths: [
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.types.ts'
      ]
    }
  ]
}