import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "World",
  password: "1234567890",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1; //set the current user first so it will show this profile upon loading.

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;",
    [currentUserId]
  ); //retrieve data where the user_id is currentUserId = 1.
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  }); //push the data 'each country code visited' into the array 'countries'
  return countries;
}

async function checkCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  //retrieve all data from table users
  users = result.rows; //assign the data to the array 'users' thus overwriting it
  return users.find((user) => user.id == currentUserId);
  //only used == instead of === since the data we compare could be a different data types when comparing
  //return only the data from the currentUserId = 1
  //{ id: 1, name: "Angela", color: "teal" },
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted(); //check the visited countries of the user and assign to GET
  const currentUser = await checkCurrentUser();
  //{ id: 1, name: "Angela", color: "teal" },

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  //what country typed will be stored as input
  const currentUser = await checkCurrentUser();
  //  { id: 1, name: "Angela", color: "teal" },

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    ); //to find the country_code if matches with input
    //if doesnt match then it doesnt exist thus was catch

    const data = result.rows[0];
    // console.log(data, "This is the data");
    //the country_code selected from database since it is the same as input by user assigned to data
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2);",
        [countryCode, currentUser.id]
        //tried to add ON CONFLICT DO NOTHING but doesnt work meaning cannot add the country
        //wont be successful if both data 'country-code, user_id' already added in the database since the data type is set to unique
      );
      console.log(countryCode, currentUser.id);
      res.redirect("/"); //if succesful adding new country_code to visited_countries then page will refresh
    } catch (err) {
      console.log(err);
      const countries = await checkVisisted();

      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: currentUser.color,
        error: "Country has already been added, try again.",
      });
    }
  } catch (err) {
    console.log(err);
    const countries = await checkVisisted();

    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      error: "Country does not exist, try again.",
    });
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    //this is calling the add family member using the value = "new" to represent as input
    res.render("new.ejs"); //it will then render the new.ejs
  } else {
    currentUserId = req.body.user;
    //the current user id will change depending on the profile clicked in index.ejs. if clicked on id: 1, name: 'jack', color: 'powderblue' then all the process will change again to match the currentUserId from the early process
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *",
    [name, color]
  ); // data inserted was return here to be used to find currentUserId

  const id = result.rows[0].id;
  currentUserId = id;

  //after new profile was added, the page will instantly go to the said new profile since the currentUserId was set to the new id

  res.redirect("/");
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
