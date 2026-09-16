// blog.js — Blog listing, Cognito login, and post creation.
//
// Auth flow (using amazon-cognito-identity-js):
//   1. Create a CognitoUserPool with the pool ID and client ID from config.js.
//   2. On form submit, build a CognitoUser from the email and call
//      authenticate() with AuthenticationDetails (email + password).
//   3. Cognito returns session data containing the IdToken — a JWT we send
//      as "Authorization: Bearer <token>" on protected API routes.
//   4. We keep the token in a plain JS variable (not localStorage) so it
//      is cleared automatically on page refresh. This is acceptable for a
//      demo / presentation scope.

(function () {
  "use strict";

  // ----- State -----
  // The IdToken lives here only — never persisted to storage.
  var idToken = null;
  var currentUser = null;

  // ----- DOM refs -----
  var loginFormContainer = document.getElementById("login-form-container");
  var loggedInView      = document.getElementById("logged-in-view");
  var loginForm         = document.getElementById("login-form");
  var loginError        = document.getElementById("login-error");
  var userEmailEl       = document.getElementById("user-email");
  var logoutBtn         = document.getElementById("logout-btn");
  var createPostForm    = document.getElementById("create-post-form");
  var createError       = document.getElementById("create-error");
  var postList          = document.getElementById("post-list");

  // ----- Initialise Cognito -----
  var poolData = {
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId:   COGNITO_CLIENT_ID
  };
  var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

  // ----- Load posts on page load -----
  loadPosts();

  // ================================================================
  // LOGIN
  // ================================================================
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginError.textContent = "";

    var email    = document.getElementById("login-email").value.trim();
    var password = document.getElementById("login-password").value;

    // Build a CognitoUser from the email address.
    var userData = { Username: email, Pool: userPool };
    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    // AuthenticationDetails wraps the raw credentials for the auth call.
    var authData = { Username: email, Password: password };
    var authDetails = new AmazonCognitoIdentity.AuthenticationDetails(authData);

    // authenticateUser() sends the credentials to Cognito. On success the
    // callback receives a session object; on failure it receives an error.
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: function (result) {
        // The IdToken is the JWT our API Gateway authorizer validates.
        idToken = result.getIdToken().getJwtToken();
        currentUser = cognitoUser;

        // Fetch the user's email from the token payload (claims).
        var payload = JSON.parse(
          atob(idToken.split(".")[1])
        );
        var emailFromToken = payload.email || email;

        showLoggedInUI(emailFromToken);
      },
      onFailure: function (err) {
        loginError.textContent = err.message || "Login failed";
      }
    });
  });

  // ================================================================
  // LOGOUT
  // ================================================================
  logoutBtn.addEventListener("click", function () {
    if (currentUser) currentUser.signOut();
    idToken = null;
    currentUser = null;
    showLoginUI();
  });

  // ================================================================
  // CREATE POST
  // ================================================================
  createPostForm.addEventListener("submit", function (e) {
    e.preventDefault();
    createError.textContent = "";

    var title   = document.getElementById("post-title").value.trim();
    var content = document.getElementById("post-content").value.trim();

    if (!title || !content) {
      createError.textContent = "Title and content are required.";
      return;
    }

    // POST /posts — protected route, requires Bearer token.
    fetch(API_BASE_URL + "/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + idToken
      },
      body: JSON.stringify({ title: title, content: content })
    })
      .then(function (res) {
        if (res.status === 401) {
          createError.textContent = "Session expired — please log in again.";
          return null;
        }
        if (!res.ok) {
          return res.json().then(function (data) {
            createError.textContent = data.error || "Failed to create post";
            return null;
          });
        }
        return res.json();
      })
      .then(function (newPost) {
        if (!newPost) return;
        // Prepend the new post to the top of the list without a full reload.
        postList.prepend(buildPostCard(newPost));
        createPostForm.reset();
      })
      .catch(function () {
        createError.textContent = "Network error — could not reach the API.";
      });
  });

  // ================================================================
  // HELPER: Fetch & render all posts
  // ================================================================
  function loadPosts() {
    // GET /posts — public route, no auth required.
    fetch(API_BASE_URL + "/posts")
      .then(function (res) { return res.json(); })
      .then(function (items) {
        if (!items || items.length === 0) {
          postList.innerHTML =
            '<div class="empty-state"><p>No posts yet — be the first to write one!</p></div>';
          return;
        }
        postList.innerHTML = "";
        items.forEach(function (item) {
          postList.appendChild(buildPostCard(item));
        });
      })
      .catch(function () {
        postList.innerHTML =
          '<div class="empty-state"><p>Could not load posts — is the API running?</p></div>';
      });
  }

  // Build a clickable card element for a single post.
  function buildPostCard(post) {
    var card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer";

    var dateStr = "";
    if (post.createdAt) {
      dateStr = new Date(parseInt(post.createdAt, 10)).toLocaleDateString();
    }

    card.innerHTML =
      "<h2>" + escapeHtml(post.title) + "</h2>" +
      '<div class="meta">By ' + escapeHtml(post.author || "unknown") +
      (dateStr ? " &middot; " + dateStr : "") + "</div>";

    card.addEventListener("click", function () {
      window.location.href = "post.html?id=" + encodeURIComponent(post.postId);
    });

    return card;
  }

  // ----- UI toggle helpers -----
  function showLoggedInUI(email) {
    loginFormContainer.style.display = "none";
    loggedInView.style.display = "block";
    userEmailEl.textContent = email;
  }

  function showLoginUI() {
    loggedInView.style.display = "none";
    loginFormContainer.style.display = "block";
    loginForm.reset();
    loginError.textContent = "";
  }

  // Basic HTML escaping to prevent XSS.
  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text || ""));
    return div.innerHTML;
  }
})();
