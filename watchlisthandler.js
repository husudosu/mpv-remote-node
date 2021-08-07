const process = require("process");
const { initDB, addMediaStatusEntry } = require("./crud");

console.log("Watchlisthandler called");
async function main() {
  await initDB();
  /*
    Required parameters:
     [0]: Filepath (Full path)
     [1]: Time
     [2]: percent-pos
  */
  const cliArgs = process.argv.slice(2);
  if (cliArgs.length < 3) {
    console.log("Not enough parameters");
    process.exit();
  }
  await addMediaStatusEntry(cliArgs[0], cliArgs[1], cliArgs[2]);
  console.log("Entry added/updated");
}

main();
