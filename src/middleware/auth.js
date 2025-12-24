// import jwt from 'jsonwebtoken';
// import User from '../model/Auth/auth.js';

// async function requireAuth(req, res, next) {
//   try {
//     const authHeader = req.headers.authorization || '';
//     const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

//     if (!token) {
//       return res.status(401).json({ message: 'Authentication required' });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
//     const user = await User.findById(decoded.userId).select('-password');

//     if (!user) {
//       return res.status(401).json({ message: 'Invalid token' });
//     }
    
//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: 'Unauthorized', error: error.message });
//   }
// }

// function requireAdmin(req, res, next) {
//   if (!req.user || req.user.role !== "admin") {
//     return res.status(403).json({ message: 'Admin access required' });
//   }
//   next();
// }

// function requireVolunteer(req, res, next) {
//   if (!req.user || req.user.role !== "volunteer") {
//     return res.status(403).json({ message: 'Volunteer access required' });
//   }
//   next();
// }

// function requireAdminOrVolunteer(req, res, next) {
//   if (!req.user || (req.user.role !== "admin" && req.user.role !== "volunteer")) {
//     return res.status(403).json({ message: 'Admin or Volunteer access required' });
//   }
//   next();
// }

// export { requireAuth, requireAdmin, requireVolunteer, requireAdminOrVolunteer };
import jwt from 'jsonwebtoken';
import User from '../model/Auth/auth.js';

// 🔐 STRICT AUTH (Login REQUIRED)
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_secret_key'
    );

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Unauthorized',
      error: error.message
    });
  }
}

// 🔓 OPTIONAL AUTH (Guest + Logged-in BOTH)
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    // 🟢 Guest user
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_secret_key'
    );

    const user = await User.findById(decoded.userId).select('-password');

    req.user = user || null;
    next();
  } catch (error) {
    // ❗ Token galat ho tab bhi public treat
    req.user = null;
    next();
  }
}

// 🔐 ROLE BASED
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

function requireVolunteer(req, res, next) {
  if (!req.user || req.user.role !== "volunteer") {
    return res.status(403).json({ message: 'Volunteer access required' });
  }
  next();
}

function requireAdminOrVolunteer(req, res, next) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "volunteer")) {
    return res.status(403).json({ message: 'Admin or Volunteer access required' });
  }
  next();
}

export {
  requireAuth,
  optionalAuth, // ⭐ NEW EXPORT
  requireAdmin,
  requireVolunteer,
  requireAdminOrVolunteer
};
