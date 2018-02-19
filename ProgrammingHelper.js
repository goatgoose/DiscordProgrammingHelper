const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const child_process = require('child_process');

client.login(fs.readFileSync("token.txt", 'utf8').trim());

var workingDirectory = '/Users/goatgoose/W/DiscordProgrammingHelper/';

var currentFunction = -1;

var jsChannel = "js";
var jsInterpreter = -1;

var pythonChannel = "python";
var pythonInterpreter = -1;

var shellChannel = "console";
var shellInstance = -1;

process.on('unhandledRejection', function(error) {
    console.log('unhandledRejection', error.message);
});

client.on('ready', function() {
    console.log('discord app init');
});


client.on('messageReactionAdd', function(messageReaction, user) {
    var message = messageReaction.message;
    if (!message.author.bot && !user.bot) {
        messageReaction.remove(user);
        if(message.content[0] === '`' && message.content[message.content.length - 1] === '`') {
            var stripped = message.content.slice(message.content.indexOf('\n'));
            stripped = stripped.slice(0, stripped.indexOf('`'));

            var type = message.content.slice(0, message.content.indexOf('\n')).trim();
            type = type.replace(/`/g, '');

            if (type === "js") {
                message.channel.send(new Function(stripped)());
            } else if (type === "cpp") {
                var cppFilePath = workingDirectory + 'cppFunc.cpp';
                fs.writeFileSync(cppFilePath,
                    "#include <iostream>\n" +
                    "using namespace std;\n" +
                    "int main() {\n" +
                    stripped + "\n" +
                    "return 0;\n" +
                    "}");

                var compiler = child_process.spawn('g++', ['-Wall', '-Wno-c++11-extensions', cppFilePath, '-o', workingDirectory + 'cppFunc']);

                compiler.stderr.on('data', function (comp_stdout) {
                    message.channel.send(comp_stdout.toString().trim());
                });

                compiler.on('close', function (code) {
                    if (code !== 1) {
                        currentFunction = child_process.spawn(workingDirectory + 'cppFunc');
                        currentFunction.stdout.on('data', function (stdout) {
                            var out = stdout.toString().trim();
                            message.channel.send(out);
                        });

                        currentFunction.on('close', function (code) {
                            currentFunction = -1;
                        });
                    }
                });
            } else if (type === "c") {
                var cFilePath = workingDirectory + 'c.c';
                fs.writeFileSync(cFilePath,
                    "#include <stdio.h>\n" +
                    "#include <stdlib.h>\n" +
                    "int main() {\n" +
                    stripped + "\n" +
                    "return 0;\n" +
                    "}");

                var compiler = child_process.spawn('gcc', ['-Wall', cFilePath, '-o', workingDirectory + 'c']);

                compiler.stderr.on('data', function(comp_stdout) {
                   message.channel.send(comp_stdout.toString().trim());
                });

                compiler.on('close', function(code) {
                    if (code !== 1) {
                        currentFunction = child_process.spawn(workingDirectory + 'c');
                        currentFunction.stdout.on('data', function (stdout) {
                            var out = stdout.toString().trim();
                            message.channel.send(out);
                        });

                        currentFunction.on('close', function (code) {
                            currentFunction = -1;
                        });
                    }
                });

            } else if (type === "py") {
                var pyFilePath = workingDirectory + 'py.py';
                fs.writeFileSync(pyFilePath, stripped);

                currentFunction = child_process.spawn('python', [workingDirectory + 'py.py']);

                currentFunction.stdout.on('data', function(stdout) {
                    var out = stdout.toString().trim();
                    message.channel.send(out);
                });

                currentFunction.on('close', function(code) {
                    currentFunction = -1;
                });
            } else {
                message.channel.send("language not supported");
            }
        }
    }
});



client.on('message', function(message) {
    if (!message.author.bot) {
        if (message.channel.name === jsChannel) {
            var content = message.content.replace(/`/g, '');
            var lines = content.split("\n");

            if (lines[0] === "start") {
                startJsInterpreter(message.channel);
            } else {
                if (jsInterpreter !== -1) {
                    for (var line in lines) {
                        jsInterpreter.stdin.write(lines[line] + "\n");
                    }
                }
            }

        } else if (message.channel.name === pythonChannel) {
            var content = message.content.replace(/`/g, '');
            var lines = content.split("\n");

            if (pythonInterpreter === -1) {
                if (lines[0] === "start") {
                    startPythonInterpreter(message.channel);
                }
            } else {
                if (lines[0] === "SIGINT") {
                    pythonInterpreter.kill("SIGINT");
                } else {
                    for (var line in lines) {
                        pythonInterpreter.stdin.write(lines[line] + "\n");
                    }
                    if (lines.length > 1) {
                        pythonInterpreter.stdin.write("\n");
                    }
                }
            }
        } else if (message.channel.name === shellChannel) {
            var content = message.content.replace(/`/g, '');
            var lines = content.split("\n");

            if (shellInstance === -1) {
                if (lines[0] === "start") {
                    startShell(message.channel);
                }
            } else {
                if (lines[0] === "SIGINT") {
                    shellInstance.kill("SIGINT");
                } else {
                    for (var line in lines) {
                        shellInstance.stdin.write(lines[line] + "\n");
                    }
                }
            }
        } else {
            if (currentFunction !== -1) {
                currentFunction.stdin.write(message.content + "\n");
            } else {
                if(message.content[0] === '`' && message.content[message.content.length - 1] === '`') {
                    message.react("▶");
                }
            }
        }
    }
});

function startShell(channel) {
    if (shellInstance !== -1) {
        shellInstance.stdin.write("exit\n");
    }

    shellInstance = child_process.spawn('dash', ['-i']);

    shellInstance.stderr.on('data', function(stderr) {
        var out = stderr.toString().trim();
        channel.send(out);
    });

    shellInstance.stdout.on('data', function(stdout) {
        var out = stdout.toString().trim();
        channel.send(out);
    });

    shellInstance.on('close', function(code) {
        shellInstance = -1;
    });
}

function startPythonInterpreter(channel) {
    if (pythonInterpreter !== -1) {
        pythonInterpreter.stdin.write("exit()\n");
    }
    pythonInterpreter = child_process.spawn('python', ['-i']);

    pythonInterpreter.stderr.on('data', function(stderr) {
        var out = stderr.toString().trim();
        var shouldSend = new RegExp(/>>>|\.\.\./);
        if (!shouldSend.test(out)) {
            channel.send(out);
        }
    });

    pythonInterpreter.stdout.on('data', function(stdout) {
        var out = stdout.toString().trim()
        channel.send(out);
    });

    pythonInterpreter.on('close', function(code) {
        pythonInterpreter = -1;
    });
}

function startJsInterpreter(channel) {
    if (jsInterpreter !== -1) {
        jsInterpreter.stdin.write(".exit\n");
    }
    jsInterpreter = child_process.spawn('node', ['-i']);

    jsInterpreter.stderr.on('data', function(stderr) {
        var out = stderr.toString().trim();
        channel.send(out);
    });

    jsInterpreter.stdout.on('data', function(stdout) {
        var out = stdout.toString().trim();
        var shouldSend = new RegExp(/\.\.\.|undefined/);
        if (!shouldSend.test(out)) {
            channel.send(out);
        }
    });

    jsInterpreter.on('close', function(code) {
        jsInterpreter = -1;
    });

    channel.send("js interpreter started");
}