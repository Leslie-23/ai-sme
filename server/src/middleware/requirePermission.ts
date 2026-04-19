import { Request, Response, NextFunction } from 'express';
import { User, PermissionKey, effectivePermissions } from '../models/User';
import { HttpError } from './error';

// Gate a route on a single permission key. OWNER always passes; STAFF must
// have the flag set to true in their User.permissions document. We resolve
// the user fresh each request so permission changes from the owner take
// effect without the staff having to log out and back in.
export function requirePermission(key: PermissionKey) {
  return async function (req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new HttpError(401, 'Authentication required');
      if (req.auth?.role === 'OWNER') return next();
      const user = await User.findById(userId).select('role permissions');
      if (!user) throw new HttpError(401, 'Session no longer valid');
      const perms = effectivePermissions({ role: user.role, permissions: user.permissions });
      if (!perms[key]) throw new HttpError(403, `You don't have permission for this action (${key})`);
      next();
    } catch (err) {
      next(err);
    }
  };
}
