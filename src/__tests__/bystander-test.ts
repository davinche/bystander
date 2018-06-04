import {Observable} from '../bystander';

describe('Observable', ()=> {
  describe('of', () => {
    it('calls my observer with all of the values passed into of', () => {
      const myObserver = { next: jest.fn() };
      Observable.of(1,2,3).subscribe(myObserver);
      expect(myObserver.next).toHaveBeenCalled();
      expect(myObserver.next.mock.calls.length).toBe(3);
      expect(myObserver.next.mock.calls[0][0]).toBe(1);
      expect(myObserver.next.mock.calls[1][0]).toBe(2);
      expect(myObserver.next.mock.calls[2][0]).toBe(3);
    });
  });

  describe('from', () => {
    it('returns  a new observable when given an observable', () => {
      const myObserver = { next: jest.fn() };
      const obs = Observable.of(1,2,3);
      const newObs = Observable.from(obs);
      newObs.subscribe(myObserver);
      expect(myObserver.next).toHaveBeenCalled();
      expect(myObserver.next.mock.calls.length).toBe(3);
      expect(myObserver.next.mock.calls[0][0]).toBe(1);
      expect(myObserver.next.mock.calls[1][0]).toBe(2);
      expect(myObserver.next.mock.calls[2][0]).toBe(3);
    });

    it ('throws an error when given something that is not iterable', () => {
      const shouldThrow = () => {
        Observable.from(function() {});
      };
      expect(shouldThrow).toThrow();
    });
  });

  describe('forEach', () => {
    it ('subscribes to an observable and returns a promise', () => {
      const obs = Observable.of(1,2,3);
      expect(obs.forEach(function() {}) instanceof Promise).toBe(true);
    });
    it ('calls the callback once for each item in the stream', () => {
      const callback = jest.fn();
      const obs = Observable.of(1,2,3);
      obs.forEach(callback);
      expect(callback.mock.calls.length).toBe(3);
      expect(callback.mock.calls[0][0]).toBe(1);
      expect(callback.mock.calls[1][0]).toBe(2);
      expect(callback.mock.calls[2][0]).toBe(3);
    });

    it ('resolves the promise on completion', async () => {
      const resolved = jest.fn();
      const obs = Observable.of(1,2,3);
      expect(resolved).not.toHaveBeenCalled();
      await obs.forEach(function(){}).then(resolved);
      expect(resolved).toHaveBeenCalled();
    });

    it ('rejects the promise on error', async () => {
      const rejected = jest.fn();
      const sub = (obs) => {
        obs.error('foo');
      };
      const obs = new Observable(sub);
      expect(rejected).not.toHaveBeenCalled();
      await obs.forEach(function(){}).catch(rejected);
      expect(rejected).toHaveBeenCalled();
    });
  });

  describe('filter', () => {
    it ('filters out all values that do not pass the test implemented by the callback', () => {
      const myObserver = { next: jest.fn() };
      const obs = Observable.of(1,2,3);
      obs.filter((val) => val > 1).subscribe(myObserver);
      expect(myObserver.next.mock.calls.length).toBe(2);
      expect(myObserver.next.mock.calls[0][0]).toBe(2);
      expect(myObserver.next.mock.calls[1][0]).toBe(3);
    });
  });

  describe('map', () => {
    it ('returns a new observable that emits values mapped by the callback', () => {
      const obs = Observable.of(1,2,3);
      const cb = (val) => val * val;
      const myObserver = { next: jest.fn() };
      obs.map(cb).subscribe(myObserver);
      expect(myObserver.next.mock.calls.length).toBe(3);
      expect(myObserver.next.mock.calls[0][0]).toBe(1);
      expect(myObserver.next.mock.calls[1][0]).toBe(4);
      expect(myObserver.next.mock.calls[2][0]).toBe(9);
    });
  });
  describe('reduce', () => {
    it ('takes each value of the stream and calls the callback to reduce it to a single entity', () => {
      const obs = Observable.of(1,2,3);
      const cb = (prev, curr) => {
        return prev + curr;
      };
      const myObserver = { next: jest.fn() };
      obs.reduce(cb).subscribe(myObserver);
      expect(myObserver.next.mock.calls[0][0]).toBe(6);
    });

    it ('returns the first item of the stream if the stream only contains 1 item', () => {
      const obs = Observable.of(1);
      const cb = (prev, curr) => {
        return prev + curr;
      };
      const myObserver = { next: jest.fn() };
      obs.reduce(cb).subscribe(myObserver);
      expect(myObserver.next.mock.calls[0][0]).toBe(1);
    });

    it ('takes a second argument that is the initial value', () => {
      const obs = Observable.of(1,2,3);
      const cb = (prev, curr) => {
        return prev + curr;
      };
      const myObserver = { next: jest.fn() };
      obs.reduce(cb, 10).subscribe(myObserver);
      expect(myObserver.next.mock.calls[0][0]).toBe(16);
    });
  });

  describe('concat', () => {
    it ('takes multiple observables and merges it into a single observable', () => {
      const ob1 = Observable.of(1,2,3);
      const ob2 = Observable.of(4,5,6);
      const myObserver = { next: jest.fn(), complete: jest.fn() };
      expect(myObserver.complete).not.toHaveBeenCalled();
      ob1.concat(ob2).subscribe(myObserver);
      expect(myObserver.next.mock.calls.length).toBe(6);
      for(let i=0; i<6; i++) {
        expect(myObserver.next.mock.calls[i][0]).toBe(i+1);
      }
      expect(myObserver.complete).toHaveBeenCalled();
      expect(myObserver.complete.mock.calls.length).toBe(1);
    });
  });

  describe('fromEvent', () => {
    it ('returns an observable that passes events for a given event name', () => {
      const elem = document.createElement('button');
      const obs = Observable.fromEvent(elem, 'click');
      const myObserver = { next: jest.fn() };
      obs.subscribe(myObserver);
      expect(myObserver.next).not.toHaveBeenCalled();

      const event = new Event('click', { bubbles: true, cancelable: true });
      elem.dispatchEvent(event);
      expect(myObserver.next).toHaveBeenCalled();
    });

    it ('does not pass the event if unsubscribe is called', () => {
      const elem = document.createElement('button');
      const obs = Observable.fromEvent(elem, 'click');
      const myObserver = { next: jest.fn() };
      let sub = obs.subscribe(myObserver);
      expect(myObserver.next).not.toHaveBeenCalled();
      sub();
      const event = new Event('click', { bubbles: true, cancelable: true });
      elem.dispatchEvent(event);
      expect(myObserver.next).not.toHaveBeenCalled();
    });
  });

  describe('fromPromise', () => {
    it ('returns an observable that listens to the results from a promise', async () => {
      const myObserver = { next: jest.fn() };
      let resolver;
      const p = new Promise((resolve) => {
        resolver = resolve;
      });

      const obs = Observable.fromPromise(p);
      obs.subscribe(myObserver);
      expect(myObserver.next).not.toHaveBeenCalled();
      await resolver('foo');
      expect(myObserver.next).toHaveBeenCalledWith('foo');
    });

    it ('does not call the observer if the promise has bene unsubscribed', async () => {
      const myObserver = { next: jest.fn() };
      let resolver;
      const p = new Promise((resolve) => {
        resolver = resolve;
      });

      const obs = Observable.fromPromise(p);
      const sub = obs.subscribe(myObserver);
      expect(myObserver.next).not.toHaveBeenCalled();
      sub();
      await resolver('foo');
      expect(myObserver.next).not.toHaveBeenCalled();
    });
  });
});
