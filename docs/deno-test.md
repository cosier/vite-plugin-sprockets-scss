@std/testing
bdd
Search for symbols (Ctrl+/)
A BDD interface to Deno.test() API.

With @std/testing/bdd module you can write your tests in a familiar format for grouping tests and adding setup/teardown hooks used by other JavaScript testing frameworks like Jasmine, Jest, and Mocha.

The describe function creates a block that groups together several related tests. The it function registers an individual test case.

Hooks
There are 4 types of hooks available for test suites. A test suite can have multiples of each type of hook, they will be called in the order that they are registered. The afterEach and afterAll hooks will be called whether or not the test case passes. The *All hooks will be called once for the whole group while the *Each hooks will be called for each individual test case.

beforeAll: Runs before all of the tests in the test suite.
afterAll: Runs after all of the tests in the test suite finish.
beforeEach: Runs before each of the individual test cases in the test suite.
afterEach: Runs after each of the individual test cases in the test suite.
If a hook is registered at the top level, a global test suite will be registered and all tests will belong to it. Hooks registered at the top level must be registered before any individual test cases or test suites.

Focusing tests
If you would like to run only specific test cases, you can do so by calling it.only instead of it. If you would like to run only specific test suites, you can do so by calling describe.only instead of describe.

There is one limitation to this when using the flat test grouping style. When describe is called without being nested, it registers the test with Deno.test. If a child test case or suite is registered with it.only or describe.only, it will be scoped to the top test suite instead of the file. To make them the only tests that run in the file, you would need to register the top test suite with describe.only too.

Ignoring tests
If you would like to not run specific individual test cases, you can do so by calling it.ignore instead of it. If you would like to not run specific test suites, you can do so by calling describe.ignore instead of describe.

Sanitization options
Like Deno.TestDefinition, the DescribeDefinition and ItDefinition have sanitization options. They work in the same way.

sanitizeExit: Ensure the test case does not prematurely cause the process to exit, for example via a call to Deno.exit. Defaults to true.
sanitizeOps: Check that the number of async completed ops after the test is the same as number of dispatched ops. Defaults to true.
sanitizeResources: Ensure the test case does not "leak" resources - ie. the resource table after the test has exactly the same contents as before the test. Defaults to true.
Permissions option
Like Deno.TestDefinition, the DescribeDefinition and ItDefinition have a permissions option. They specify the permissions that should be used to run an individual test case or test suite. Set this to "inherit" to keep the calling thread's permissions. Set this to "none" to revoke all permissions.

This setting defaults to "inherit".

There is currently one limitation to this, you cannot use the permissions option on an individual test case or test suite that belongs to another test suite. That's because internally those tests are registered with t.step which does not support the permissions option.

Comparing to Deno.test
The default way of writing tests is using Deno.test and t.step. The describe and it functions have similar call signatures to Deno.test, making it easy to switch between the default style and the behavior-driven development style of writing tests. Internally, describe and it are registering tests with Deno.test and t.step.

Below is an example of a test file using Deno.test and t.step. In the following sections there are examples of how the same test could be written with describe and it using nested test grouping, flat test grouping, or a mix of both styles.

import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";

class User {
  static users: Map<string, User> = new Map();
  name: string;
  age?: number;

  constructor(name: string) {
    if (User.users.has(name)) {
      throw new Deno.errors.AlreadyExists(`User ${name} already exists`);
    }
    this.name = name;
    User.users.set(name, this);
  }

  getAge(): number {
    if (!this.age) {
      throw new Error("Age unknown");
    }
    return this.age;
  }

  setAge(age: number) {
    this.age = age;
  }
}

Deno.test("User.users initially empty", () => {
  assertEquals(User.users.size, 0);
});

Deno.test("User constructor", () => {
  try {
    const user = new User("Kyle");
    assertEquals(user.name, "Kyle");
    assertStrictEquals(User.users.get("Kyle"), user);
  } finally {
    User.users.clear();
  }
});

Deno.test("User age", async (t) => {
  const user = new User("Kyle");

  await t.step("getAge", () => {
    assertThrows(() => user.getAge(), Error, "Age unknown");
    user.age = 18;
    assertEquals(user.getAge(), 18);
  });

  await t.step("setAge", () => {
    user.setAge(18);
    assertEquals(user.getAge(), 18);
  });
});
Nested test grouping
Tests created within the callback of a describe function call will belong to the new test suite it creates. The hooks can be created within it or be added to the options argument for describe.

import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "@std/testing/bdd";

class User {
  static users: Map<string, User> = new Map();
  name: string;
  age?: number;

  constructor(name: string) {
    if (User.users.has(name)) {
      throw new Deno.errors.AlreadyExists(`User ${name} already exists`);
    }
    this.name = name;
    User.users.set(name, this);
  }

  getAge(): number {
    if (!this.age) {
      throw new Error("Age unknown");
    }
    return this.age;
  }

  setAge(age: number) {
    this.age = age;
  }
}

describe("User", () => {
  it("users initially empty", () => {
    assertEquals(User.users.size, 0);
  });

  it("constructor", () => {
    try {
      const user = new User("Kyle");
      assertEquals(user.name, "Kyle");
      assertStrictEquals(User.users.get("Kyle"), user);
    } finally {
      User.users.clear();
    }
  });

  describe("age", () => {
    let user: User;

    beforeEach(() => {
      user = new User("Kyle");
    });

    afterEach(() => {
      User.users.clear();
    });

    it("getAge", function () {
      assertThrows(() => user.getAge(), Error, "Age unknown");
      user.age = 18;
      assertEquals(user.getAge(), 18);
    });

    it("setAge", function () {
      user.setAge(18);
      assertEquals(user.getAge(), 18);
    });
  });
});
Flat test grouping
The describe function returns a unique symbol that can be used to reference the test suite for adding tests to it without having to create them within a callback. The gives you the ability to have test grouping without any extra indentation in front of the grouped tests.

import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import {
  describe,
  it,
} from "@std/testing/bdd";

class User {
  static users: Map<string, User> = new Map();
  name: string;
  age?: number;

  constructor(name: string) {
    if (User.users.has(name)) {
      throw new Deno.errors.AlreadyExists(`User ${name} already exists`);
    }
    this.name = name;
    User.users.set(name, this);
  }

  getAge(): number {
    if (!this.age) {
      throw new Error("Age unknown");
    }
    return this.age;
  }

  setAge(age: number) {
    this.age = age;
  }
}

const userTests = describe("User");

it(userTests, "users initially empty", () => {
  assertEquals(User.users.size, 0);
});

it(userTests, "constructor", () => {
  try {
    const user = new User("Kyle");
    assertEquals(user.name, "Kyle");
    assertStrictEquals(User.users.get("Kyle"), user);
  } finally {
    User.users.clear();
  }
});

const ageTests = describe({
  name: "age",
  suite: userTests,
  beforeEach(this: { user: User }) {
    this.user = new User("Kyle");
  },
  afterEach() {
    User.users.clear();
  },
});

it(ageTests, "getAge", function () {
  const { user } = this;
  assertThrows(() => user.getAge(), Error, "Age unknown");
  user.age = 18;
  assertEquals(user.getAge(), 18);
});

it(ageTests, "setAge", function () {
  const { user } = this;
  user.setAge(18);
  assertEquals(user.getAge(), 18);
});
Mixed test grouping
Both nested test grouping and flat test grouping can be used together. This can be useful if you'd like to create deep groupings without all the extra indentation in front of each line.

import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import {
  describe,
  it,
} from "@std/testing/bdd";

class User {
  static users: Map<string, User> = new Map();
  name: string;
  age?: number;

  constructor(name: string) {
    if (User.users.has(name)) {
      throw new Deno.errors.AlreadyExists(`User ${name} already exists`);
    }
    this.name = name;
    User.users.set(name, this);
  }

  getAge(): number {
    if (!this.age) {
      throw new Error("Age unknown");
    }
    return this.age;
  }

  setAge(age: number) {
    this.age = age;
  }
}

describe("User", () => {
  it("users initially empty", () => {
    assertEquals(User.users.size, 0);
  });

  it("constructor", () => {
    try {
      const user = new User("Kyle");
      assertEquals(user.name, "Kyle");
      assertStrictEquals(User.users.get("Kyle"), user);
    } finally {
      User.users.clear();
    }
  });

  const ageTests = describe({
    name: "age",
    beforeEach(this: { user: User }) {
      this.user = new User("Kyle");
    },
    afterEach() {
      User.users.clear();
    },
  });

  it(ageTests, "getAge", function () {
    const { user } = this;
    assertThrows(() => user.getAge(), Error, "Age unknown");
    user.age = 18;
    assertEquals(user.getAge(), 18);
  });

  it(ageTests, "setAge", function () {
    const { user } = this;
    user.setAge(18);
    assertEquals(user.getAge(), 18);
  });
});
Functions
after
Alias of afterAll.
afterAll
Run some shared teardown after all of the tests in the suite.
afterEach
Run some shared teardown after each test in the suite.
before
Alias of beforeAll
beforeAll
Run some shared setup before all of the tests in the suite.
beforeEach
Run some shared setup before each test in the suite.
test
Alias of it
Interfaces
describe
Registers a test suite.
ignore
only
skip
DescribeDefinition
The options for creating a test suite with the describe function.
afterAll
afterEach
beforeAll
beforeEach
fn
suite
it
Registers an individual test case.
ignore
only
skip
ItDefinition
The options for creating an individual test case with the it function.
fn
suite
TestSuite
A group of tests.
symbol
Type Aliases
DescribeArgs
The arguments for a DescribeFunction.
ItArgs
The arguments for an ItFunction.
Variables
describe.ignore
Ignore the test suite.
describe.only
Only execute this test suite.
describe.skip
Skip the test suite.
it.ignore
Ignore this test case.
it.only
Only execute this test case.
it.skip
Skip this test case.
