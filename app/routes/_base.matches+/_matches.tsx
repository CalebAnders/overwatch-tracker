import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useCatch, Link, Outlet } from '@remix-run/react';
import { Button } from '~/components/Button';
import type { UserSession } from '~/services/auth.server';
import { authenticator } from '~/services/auth.server';
import { db } from '~/services/db.server';
import {
  getSession,
  getStatusMessageFromSession,
  sessionStorage,
} from '~/services/session.server';
import { updateSeason } from '~/utils/season-data';

async function updateSeasonDatabaseValue() {
  await updateSeason();
}

export const loader = async ({ request }: LoaderArgs) => {
  const user = (await authenticator.isAuthenticated(request, {
    failureRedirect: '/login',
  })) as UserSession;
  const session = await getSession(request.headers.get('Cookie'));
  const statusMessage = getStatusMessageFromSession(session);

  const matchHistoryListItems = await db.match.findMany({
    take: 50,
    orderBy: { createdAt: 'asc' },
    include: { location: true },
    where: { createdBy: user?.id },
  });
  return json(
    { matchHistoryListItems, statusMessage },
    { headers: { 'Set-Cookie': await sessionStorage.commitSession(session) } }
  );
};

export default function Matches() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <main>
        <div>
          <div>
            <ul>
              {data.matchHistoryListItems[0]
                ? data.matchHistoryListItems.map((match) => (
                    <li key={match.id}>
                      <Link prefetch="intent" to={match.id}>
                        {match.location.name} - {match.matchResult} -{' '}
                        {match.createdAt.split('T')[0]}
                      </Link>
                    </li>
                  ))
                : "You haven't added any matches yet"}
            </ul>
            <Link to="new">
              <Button>Add New Match</Button>
            </Link>
          </div>
          <div>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return <div>There are no matches to display.</div>;
  }
  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}
