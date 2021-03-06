import { cot, createTodos, ct, Todo, TodosStore } from './setup';
import { AkitaNoActiveError } from '../src/internal/error';
import { isObject } from '../src/internal/utils';
import { Subscription } from 'rxjs';
import { getInitialEntitiesState } from '../src/api/entity-store';
import { QueryEntity } from '../src/api/query-entity';

let store = new TodosStore();
const query = new QueryEntity(store);

function ga(spy, num = 0) {
  return spy.mock.calls[num][0];
}

describe('Entities Query', () => {
  let spy;
  let sub;

  beforeEach(() => {
    spy = jest.fn();
    store.remove();
  });

  afterEach(() => sub && sub.unsubscribe());

  it('should set the initial value', () => {
    expect(store._value()).toEqual({ active: null, metadata: { name: 'metadata' }, ...getInitialEntitiesState() });
  });

  describe('Select', () => {
    it('should select ids', () => {
      sub = query.select(state => state.ids).subscribe(spy);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(store._value().ids);
    });

    it('should select entities', () => {
      sub = query.select(state => state.entities).subscribe(spy);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(store._value().entities);
    });

    it('should fire only when updating the state', () => {
      sub = query.select(state => state.entities).subscribe(spy);
      let todo = cot();
      store.add(todo);
      expect(store._value().entities[1]).toBe(todo);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(ga(spy)).toEqual({});
      expect(ga(spy, 1)).toEqual({ 1: todo });
    });
  });

  describe('selectAll', () => {
    it('should select all as array', () => {
      let todo = cot();
      store.add(todo);
      sub = query.selectAll().subscribe(spy);
      expect(spy).toHaveBeenCalledTimes(1);
      const todos = ga(spy);
      expect(Array.isArray(todos)).toBeTruthy();
      expect(todos.length).toEqual(1);
      expect(todos[0]).toBe(todo);
    });

    it('should select all as map', () => {
      let todo = cot();
      store.add(todo);
      sub = query.selectAll({ asObject: true }).subscribe(spy);
      expect(spy).toHaveBeenCalledTimes(1);
      const todos = ga(spy);
      expect(Array.isArray(todos)).toBeFalsy();
      expect(Object.keys(todos).length).toEqual(1);
      expect(todos[1]).toBe(todo);
    });
  });

  describe('getAll', () => {
    it('should get all as array', () => {
      let todo = cot();
      store.add(todo);
      const todos = query.getAll();
      expect(Array.isArray(todos)).toBe(true);
      expect(todos.length).toBe(1);
      expect(todos[0]).toBe(todo);
    });

    it('should get all as map', () => {
      let todo = cot();
      store.add(todo);
      const todos = query.getAll({ asObject: true });
      expect(Array.isArray(todos)).toBe(false);
      expect(todos[1]).toBe(todo);
    });
  });

  describe('selectEntity', () => {
    it('should select entity', () => {
      let todo = cot();
      store.add(todo);
      sub = query.selectEntity(1).subscribe(spy);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(ga(spy)).toBe(todo);
    });

    it('should select slice from entity', () => {
      let todo = cot();
      store.add(todo);
      sub = query.selectEntity(1, entity => entity.title).subscribe(spy);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(ga(spy)).toBe(todo.title);
    });

    it('should not fire when the selected value does not changed', () => {
      let todo = cot();
      store.add(todo);
      sub = query.selectEntity(1, entity => entity.title).subscribe(spy);
      store.update(1, { completed: true });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should fire when the selected value changed', () => {
      let todo = cot();
      store.add(todo);
      sub = query.selectEntity(1, entity => entity.title).subscribe(spy);
      store.update(1, { title: 'changed' });
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should not throw when the entity does not exists', () => {
      sub = query.selectEntity(2, entity => entity.title).subscribe(entity => {
        expect(entity).toBe(undefined);
      });
    });
  });

  describe('getEntity', () => {
    it('should get the entity', () => {
      let todo = cot();
      store.add(todo);
      expect(query.getEntity(1)).toBe(todo);
    });
  });

  describe('selectActive', () => {
    it('should throw when active is undefined', () => {
      expect(function() {
        query.selectActive().subscribe(active => expect(active).toBe(query.getActive()));
      }).toThrow(new AkitaNoActiveError() as any);
    });

    it('should select the active id', () => {
      let todo = cot();
      store.add(todo);
      store.setActive(1);
      sub = query.selectActiveId().subscribe(activeId => expect(activeId).toBe(1));
    });

    it('should select the active', () => {
      let todo = cot();
      store.add(todo);
      store.setActive(1);
      sub = query.selectActive().subscribe(active => expect(active).toBe(query.getActive()));
    });

    it('should select a slice from the active', () => {
      let todo = cot();
      store.add(todo);
      store.setActive(1);
      sub = query.selectActive(entity => entity.title).subscribe(title => expect(title).toBe(query.getActive().title));
    });
  });

  describe('getActive', () => {
    it('should get the active id', () => {
      let todo = cot();
      store.add(todo);
      store.setActive(1);
      expect(query.getActiveId()).toBe(1);
    });

    it('should get the active', () => {
      let todo = cot();
      store.add(todo);
      store.setActive(1);
      expect(query.getActive()).toBe(todo);
    });
  });

  describe('selectCount', () => {
    it('should return the count', () => {
      let factory = ct();
      store.add(factory());
      sub = query.selectCount().subscribe(spy);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(1);
      store.add(factory());
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(2);
    });
    it('should return the count based on the condition', () => {
      let factory = ct();
      store.add(factory());
      sub = query.selectCount(entity => entity.completed).subscribe(spy);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(0);
      store.add(factory());
      store.update(1, { completed: true });
      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith(1);
    });
  });

  describe('getCount', () => {
    it('should return the count', () => {
      let factory = ct();
      store.add(factory());
      expect(query.getCount()).toEqual(1);
    });

    it('should return the count based on the condition', () => {
      let factory = ct();
      store.add(factory());
      const initial = query.getCount(entity => entity.completed);
      expect(initial).toEqual(0);
      store.add(factory());
      store.update(1, { completed: true });
      const updated = query.getCount(entity => entity.completed);
      expect(updated).toEqual(1);
    });
  });

  describe('hasEntity', () => {
    it('should have entity', () => {
      let todo = cot();
      store.add(todo);
      expect(query.hasEntity(1)).toBeTruthy();
    });

    it('should have entity - callback', () => {
      let todo = cot();
      store.add(todo);
      expect(query.hasEntity(entity => entity.completed)).toBeFalsy();
    });

    it('should NOT have entity - callback', () => {
      let todo = cot();
      store.add(todo);
      expect(query.hasEntity(entity => entity.title === 'not exists')).toBeFalsy();
    });

    it('should NOT have entity', () => {
      expect(query.hasEntity(5)).toBeFalsy();
    });
  });
});

describe('State', () => {
  it('should get the initial state', () => {
    expect(getInitialEntitiesState()).toEqual({
      entities: {},
      loading: true,
      ids: [],
      error: null
    });
  });
});

const todosStore = new TodosStore();
const queryTodos = new QueryEntity(todosStore);

describe('getAll', () => {
  beforeEach(() => {
    todosStore.remove();
    todosStore.add([new Todo({ id: 1, title: 'aaa' }), new Todo({ id: 2, title: 'bbb' })]);
  });

  it('should getAll - asArray', () => {
    const search = queryTodos.getAll();
    expect(search.length).toEqual(2);
  });

  it('should getAll - asObject', () => {
    const search = queryTodos.getAll({
      asObject: true
    });
    expect(search[1]).toEqual(new Todo({ id: 1, title: 'aaa' }));
    expect(search[2]).toEqual(new Todo({ id: 2, title: 'bbb' }));
  });

  it('should support filter by function', () => {
    const result = queryTodos.getAll({
      filterBy: entity => entity.title === 'aaa'
    });
    expect(Array.isArray(result)).toBeTruthy();
    expect(result.length).toEqual(1);
    expect(result[0].title).toEqual('aaa');
  });

  it('should support filter by function - asObject', () => {
    const result = queryTodos.getAll({
      asObject: true,
      filterBy: entity => entity.title === 'aaa'
    });
    expect(isObject(result)).toBeTruthy();
    expect(Object.keys(result).length).toEqual(1);
    expect(result[1].title).toEqual('aaa');
  });

  it('should support limitTo', () => {
    const res = queryTodos.getAll({
      limitTo: 1
    });
    expect(res.length).toBe(1);
  });

  it('should support limitTo - asObject', () => {
    const res = queryTodos.getAll({
      limitTo: 1,
      asObject: true
    });

    expect(Object.keys(res).length).toBe(1);
  });
});

describe('selectAll', () => {
  let subscription: Subscription;
  let spy;
  beforeEach(() => {
    todosStore.remove();
    todosStore.add([new Todo({ id: 1, title: 'aaa' }), new Todo({ id: 2, title: 'bbb' })]);
  });

  beforeEach(() => (spy = jest.fn()));
  afterEach(() => subscription && subscription.unsubscribe());

  it('should selectAll - asArray', () => {
    subscription = queryTodos.selectAll().subscribe(result => {
      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toEqual(2);
    });
  });

  it('should selectAll with search by - asArray', () => {
    subscription = queryTodos
      .selectAll({
        filterBy: entity => entity.title === 'aaa'
      })
      .subscribe(result => {
        expect(Array.isArray(result)).toBeTruthy();
        expect(result.length).toEqual(1);
        expect(result[0].title).toEqual('aaa');
      });
  });

  it('should selectAll - asMap', () => {
    subscription = queryTodos.selectAll({ asObject: true }).subscribe(result => {
      expect(isObject(result)).toBeTruthy();
      expect(Object.keys(result).length).toEqual(2);
    });
  });

  it('should selectAll with search by - asMap', () => {
    subscription = queryTodos
      .selectAll({
        asObject: true,
        filterBy: entity => entity.title === 'aaa'
      })
      .subscribe(result => {
        expect(isObject(result)).toBeTruthy();
        expect(Object.keys(result).length).toEqual(1);
        expect(result[1].title).toEqual('aaa');
      });
  });

  it('should support limitTo', () => {
    let res;
    subscription = queryTodos
      .selectAll({
        limitTo: 1
      })
      .subscribe(_res => {
        res = _res;
      });
    expect(res.length).toBe(1);
  });

  it('should support limitTo - asObject', () => {
    let res;
    subscription = queryTodos
      .selectAll({
        limitTo: 1,
        asObject: true
      })
      .subscribe(_res => {
        res = _res;
      });
    expect(Object.keys(res).length).toBe(1);
  });
});

describe('validateCache', () => {
  const todosStore = new TodosStore();
  const queryTodos = new QueryEntity(todosStore);

  beforeEach(() => {
    todosStore.remove();
  });

  it('should be isPristine', () => {
    expect(queryTodos.isPristine).toBeTruthy();
  });

  it('should should be dirty', () => {
    todosStore.set([new Todo({ id: 1, title: 'aaa' }), new Todo({ id: 2, title: 'bbb' })]);
    expect(queryTodos.isPristine).toBeFalsy();
    expect(queryTodos.isDirty).toBeTruthy();
  });

  it('should invoke the function after remove', () => {
    todosStore.set([new Todo({ id: 1, title: 'aaa' }), new Todo({ id: 2, title: 'bbb' })]);
    todosStore.remove();
    expect(queryTodos.isPristine).toBeTruthy();
    expect(queryTodos.isDirty).toBeFalsy();
  });
});

describe('Many', () => {
  jest.useFakeTimers();
  const todosStore = new TodosStore();
  const queryTodos = new QueryEntity(todosStore);
  let spy;

  beforeEach(() => {
    spy = jest.fn();
    todosStore.remove();
  });

  describe('SelectMany', () => {
    it('should select many', () => {
      queryTodos.selectMany([0, 1]).subscribe(spy);
      todosStore.add(createTodos(3));
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(createTodos(2));
    });

    it('should not fire when different entity change', () => {
      todosStore.add(createTodos(3));
      queryTodos.selectMany([0, 1]).subscribe(spy);
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(createTodos(2));
      todosStore.update(2, { completed: true });
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not return entity that does not exists', () => {
      todosStore.add(createTodos(3));
      queryTodos.selectMany([0, 1, 743]).subscribe(spy);
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledWith(createTodos(2));
      todosStore.update([0, 1], { completed: true });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should select many - allow undefined', () => {
      queryTodos.selectMany([0, 1], { filterUndefined: false }).subscribe(spy);
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith([undefined, undefined]);
    });

    it('should select many - asObject', () => {
      queryTodos.selectMany([0, 1], { asObject: true }).subscribe(spy);
      todosStore.add(createTodos(3));
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        0: {
          id: 0,
          title: `Todo ${0}`,
          complete: false
        },
        1: {
          id: 1,
          title: `Todo ${1}`,
          complete: false
        }
      });
    });

    it('should select many - asObject and return undefined', () => {
      queryTodos.selectMany([0, 1], { asObject: true, filterUndefined: false }).subscribe(spy);
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ 0: undefined, 1: undefined });
    });

    it('should not return entity that does not exists - asObject', () => {
      todosStore.add(createTodos(3));
      queryTodos.selectMany([0, 1, 743], { asObject: true }).subscribe(spy);
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        0: {
          id: 0,
          title: `Todo ${0}`,
          complete: false
        },
        1: {
          id: 1,
          title: `Todo ${1}`,
          complete: false
        }
      });
    });
  });
});

describe('Check subscriptions calls', () => {
  const todosStore = new TodosStore();
  const queryTodos = new QueryEntity(todosStore);
  let spy;

  beforeEach(() => {
    spy = jest.fn();
    todosStore.remove();
  });

  it('should call twice - initial and after set', () => {
    queryTodos.selectAll().subscribe(spy);
    expect(spy).toHaveBeenCalledWith([]);
    todosStore.set(createTodos(3));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(createTodos(3));
    expect(queryTodos.getSnapshot().ids).toEqual([0, 1, 2]);
  });

  it('should call three times - initial and after set + add', () => {
    queryTodos.selectAll().subscribe(spy);
    expect(spy).toHaveBeenCalledWith([]);
    todosStore.set(createTodos(3));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(createTodos(3));
    expect(queryTodos.getSnapshot().ids).toEqual([0, 1, 2]);
    todosStore.add({ id: 3, title: '3', completed: false });
    expect(spy).toHaveBeenCalledTimes(3);
    expect(queryTodos.getEntity(3)).toBeDefined();
    expect(queryTodos.getSnapshot().ids).toEqual([0, 1, 2, 3]);
  });

  it('should call three times - initial and after set + update', () => {
    queryTodos.selectAll().subscribe(spy);
    expect(spy).toHaveBeenCalledWith([]);
    todosStore.set(createTodos(3));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(createTodos(3));
    expect(queryTodos.getSnapshot().ids).toEqual([0, 1, 2]);
    todosStore.update(1, { completed: true });
    expect(spy).toHaveBeenCalledTimes(3);
    expect(queryTodos.getEntity(1).completed).toEqual(true);
  });

  it('should call three times - initial and after set + remove', () => {
    queryTodos.selectAll().subscribe(spy);
    expect(spy).toHaveBeenCalledWith([]);
    todosStore.set(createTodos(3));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(createTodos(3));
    expect(queryTodos.getSnapshot().ids).toEqual([0, 1, 2]);
    todosStore.remove(1);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(queryTodos.getEntity(1)).toEqual(undefined);
    expect(queryTodos.getSnapshot().ids).toEqual([0, 2]);
  });
});
