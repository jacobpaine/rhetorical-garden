import { Link, routes } from '../router/router';

export function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h1 className="mb-2 text-xl font-semibold">Not found</h1>
      <p className="mb-4 text-ink-500 dark:text-ink-300">
        That page or level doesn't exist.
      </p>
      <Link to={routes.home()} className="btn-primary">
        Back home
      </Link>
    </div>
  );
}
