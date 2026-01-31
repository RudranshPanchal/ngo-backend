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

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      console.log("[Auth] No token provided in header");
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_secret_key'
    );

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      console.log("[Auth] User not found in DB for ID:", decoded.userId);
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(" [Auth] Verification Error:", error.message);
    return res.status(401).json({
      message: 'Unauthorized',
      error: error.message
    });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

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
    req.user = null;
    next();
  }
}

function requireAdmin(req, res, next) {
console.log("🔐 ADMIN CHECK USER:", req.user);
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
 const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Yahan check karein ki aapka payload 'email' bhej raha hai ya nahi
        // Agar login ke waqt aapne email token mein daali thi, toh ye chalega
        req.user = {
            id: decoded.id || decoded._id,
            email: decoded.email // Yeh line verify karein
        };
        
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
export {
  verifyToken,
  requireAuth,
  optionalAuth, 
  requireAdmin,
  requireVolunteer,
  requireAdminOrVolunteer
};
